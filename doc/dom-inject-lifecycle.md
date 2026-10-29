---
type: Survey
title: Page-world connector lifecycle and the cost of unshared scripts
description: Ecosystem picture of the dom-inject scripts — six independent wait/retry implementations, nine cleanup-contract copies, and three live bugs in deezer/webhook-auth — grounding a future shared page-world helper.
resource: /doc/dom-inject-lifecycle.md
status: draft
author: rektide
generated:
  at: 2026-10-29
  by: model:glm-5.3
sources:
  - resource: opencode://ses_e76ab1d35ffe5rfIc6T3xll18h
    title: Direction, grounding analysis, and synthesis of the survey into this document
  - resource: opencode://ses_e764a240affeLaCOgHkcRjRuB8
    title: Flash survey of connector wait/retry/timer/lifecycle duplication with file:line evidence
tags:
  - dom-inject
  - page-world
  - connectors
  - lifecycle
---

# Page-world connector lifecycle and the cost of unshared scripts

Written while landing the YouTube Music selector rework (`ytm-new`), which
produced a small, legible lifecycle for a page-world script: `trailingTimer`
(a guarded, self-clearing timer pair), `retryUntil` (immediate plus throttled
mutation-driven attempts until success), and the `window.cleanup` generation
contract. The open question was whether other connectors duplicate this
machinery badly enough to justify a shared helper. A survey of the connector
tree says yes — as standardization and bug fixes, not as a large saving in
lines.

## Is the non-sharing by design?

Partly, and the distinction matters for how far a shared helper changes the
grounding.

- **Isolated world: sharing is the design, via globals.** Connector files
  never import runtime code. The harness provides everything as ambient
  globals — `Connector`, `Util`, `MetadataFilter`, `webScrobblerScripts`,
  `STARTER_LOADED` — declared in
  [`src/connectors/connector.d.ts:3-8`](/src/connectors/connector.d.ts).
- **Page world: no provision exists.** The injected `<script src>` runs with
  no harness and no globals; esbuild bundles each connector entry
  individually (`scripts/compile-connectors.ts:19`), so nothing is shared at
  runtime either. No `*dom-inject*` file contains a single runtime import
  today.

So page-world scripts don't avoid sharing because of a ruling; they avoid it
because the mechanism was never built. A shared, imported helper module is
the same architecture as the isolated world's provisioned globals — the
bundler does the providing. The deezer bug below is what the gap costs when
an author assumes otherwise.

## The ecosystem picture

Eleven page-world scripts (`src/connectors/*dom-inject*`). Three groups:

**Six independent wait/retry implementations**, none throttled, all with
arbitrary constants:

| Script | Shape | Interval / bound |
|---|---|---|
| `deezer-dom-inject.ts:21-38` | recursive `setTimeout` chain | 1007 ms; bound broken (below) |
| `jwplayer-dom-inject.ts:76-92` | `setInterval` poll until `window.jwplayer` | 2 s, unbounded until found |
| `musickit-dom-inject.ts:69-84` | promise-wrapped `setInterval` | 100 ms, 100 attempts |
| `webhook-auth-dom-inject.ts:13-27` | bare `setInterval` | 1 s, never cleared |
| `telegram-k-dom-inject.ts:81-88` | body `MutationObserver` until global appears | unthrottled |
| isolated world: `echo.ts:51-60`, `musicoin.ts:84-96` | `setInterval` polls | 2 s, unbounded until found |

All six are `retryUntil(attempt, interval)` with different accidents of
implementation.

**Nine copies of the cleanup generation boilerplate** (invoke prior
generation's `window.cleanup`, install the new one), with `jwplayer` a
slight variant and `webhook-auth` missing the contract entirely — its
interval is never cleared and stacks on every re-injection.

**Genuinely different** and correctly left alone: event-subscriber scripts
(`vk`, `gensokyoradio`, `hearthis-at`), UI watchers (`eggs`, `ilovemusic`,
`focusatwill`), deliberate permanent heartbeats (`jam.coop.ts:94`), and
debounce semantics (`iheart.ts:77-83`).

## Live bugs the gap has already produced

1. **deezer `Util` ReferenceError** — `deezer-dom-inject.ts:36` and `:155-158`
   call `Util.debugLog(...)` with no import. `Util` is an isolated-world
   global that does not exist in the page world; the built artifact carries
   the unresolved reference. The `:155` site is reachable and throws inside
   `sendEvent`'s timeout, so the `postMessage` never happens: unrecognized
   media types silently produce no state. The `:36` site is currently
   unreachable (see 2), which is the only reason this has not been reported.
2. **deezer retry bound is illusory** — `retries` is declared inside
   `initConnector` (`:22`), so every recursive call sees a fresh `0` and
   `retries < 6` never triggers: an infinite 1007 ms poll, with the failure
   branch unreachable.
3. **webhook-auth interval leak** — no cleanup contract; re-injection stacks
   `setInterval` handles.

Tripwire comments marking 1 and 2 in the deezer source live on this branch;
they are deliberately comments, not fixes, to be resolved with the extraction.

## Isolated-world equivalents that already exist

- `Util.throttle` (`src/core/content/util.ts:308-325`): leading+trailing
  throttle; no cancel handle exposed.
- `setupSecondObserver` (`src/core/content/starter.ts:126-143`):
  wait-for-element via document observer, disconnect-on-found —
  `retryUntil`-shaped, core-owned, unthrottled.

`focusatwill.ts:43-58` shows the isolated idiom: an observer whose callback
is wrapped in `Util.throttle` — exactly what `retryUntil`'s `onMutation`
re-implements for the page world.

## Build support and caveats

esbuild `--bundle` inlines imports into each connector entry, and
`tsconfig.connectors.json` `@/*` paths are honored: a page-world script can
import a shared helper today, per-file, with no shared chunk and no runtime
coupling. Two caveats to smoke-test before relying on it:

1. Dev HMR watches only `src/connectors/` (`vite.configs.ts:119`); a helper
   outside that directory will not trigger rebuilds during development.
2. A helper inside `src/connectors/*.ts` becomes its own esbuild glob entry,
   emitting an orphan (harmless, never-injected) artifact.

## Proposed long-term surface

A small leaf module with no extension-API references, e.g.
`src/core/content/page-lifecycle.ts`:

```ts
runWithCleanup(setup: () => () => void): void;
retryUntil(attempt: () => boolean, interval: number): () => void;
```

`runWithCleanup` replaces the nine boilerplate copies; `retryUntil` is taken
as-is from the YouTube Music script. One design commitment for that module:
**the throttle should own all of the time math.** In the current
`ytm-new` shape, `lastAttempt` and the `interval - elapsed` computation live
in `retryUntil` while the timer pair holds the pending state; when this is
extracted, the shared surface should expose the throttle itself — leading
plus trailing, cancel handle included — so call sites never compute
durations. `trailingTimer` stays private: the survey found no consumer that
needs a bare timer pair.

## Sequencing

- `ytm-new` (selector fix) stays minimal, as the upstream maintainer asked.
- This document plus the deezer tripwire comments are fork-side records.
- The extraction — shared module, migration of the six wait/retry sites and
  nine boilerplate copies, and resolution of the three bugs — is its own
  follow-up branch and PR story.
