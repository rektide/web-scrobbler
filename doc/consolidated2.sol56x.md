---
type: Design
title: Composable page readiness and wake-up sources
description: Six readiness waits share an immediate guarded attempt loop while retaining explicit mutation or polling wake-ups and Deezer's bounded termination.
resource: /doc/consolidated2.sol56x.md
status: draft
author: 'model:openai/gpt-6.1-sol#xhigh'
generated:
    at: 2026-10-30
    by: 'model:openai/gpt-6.1-sol#xhigh'
sources:
    - resource: opencode://ses_e75a43e2fffetzH2WaDtIORy63
      title: Implement and verify source-composed readiness, disposal guards and six caller migrations
    - resource: opencode://ses_e76ab1d35ffe5rfIc6T3xll18h
      title: Parent direction and operator-approved next consolidated iteration
    - resource: /doc/consolidated1.sol56x.md#round-2-review-findings-incorporated
      title: Previous polling repairs, regression baseline and outstanding queued-attempt limitation
    - resource: /doc/dom-inject-lifecycle.md#the-ecosystem-picture
      title: Original survey of independent wait implementations and their different triggers
    - resource: /src/core/content/page-lifecycle.ts
      title: Notification sources, guarded untilReady and unchanged private throttle
    - resource: /tests/content/page-lifecycle.test.ts
      title: Source composition, scheduling, synchronous subscription and disposal tests
    - resource: /tests/content/page-inject.test.ts
      title: Actual page-script readiness, retry-budget and cleanup tests
    - resource: /scripts/compile-connectors.ts
      title: Existing independent-entry esbuild command used for the one-shot smoke check
tags:
    - page-world
    - readiness
    - lifecycle
---

# Composable page readiness and wake-up sources

Implementation commit **`6655cac8`**, based on **`24d0a2a6`**, replaces all
six page-script readiness waits with one composition. This supersedes the
split mechanisms and queued-attempt limitation in the
[previous round](/doc/consolidated1.sol56x.md#round-2-review-findings-incorporated),
without rewriting that historical account. The
[original survey](/doc/dom-inject-lifecycle.md#the-ecosystem-picture)'s reuse
opportunity remains; different readiness conditions need different wake-ups.

## Contract and design decisions

```ts
type RetrySource = (notify: () => void) => () => void;

untilReady(attachPlayer, onMutations(document.body, 2000));
untilReady(attachSdk, every(1000));
```

- **Sources notify, attempts decide.** Both factories are inert until
  subscribed. `onMutations(target, interval)` observes child-list changes
  throughout the target's subtree and throttles notifications.
  `every(interval)` uses a plain interval, with no redundant throttle.
- **Immediate completion activates no source.** `untilReady` attempts first;
  only a false result subscribes. Its returned disposer is idempotent.
- **Disposal and completion share one stopped guard.** Already queued or
  stale notifications cannot run the attempt after either event. A source
  may notify synchronously during subscription: the unsubscribe variable is
  initialized safely, and completion then unsubscribes as soon as the source
  returns its disposer. Reentrant notifications during unsubscribe are ignored.
- **The private throttle is unchanged.** It still returns bare `runThrottle`,
  with leading and trailing execution and no cancellation handle. A source's
  unsubscribe disconnects observation; a queued trailing notification can
  still fire, but `untilReady` makes it harmless. The immediate attempt no
  longer starts the notification throttle's window: the first mutation can
  retry immediately, with subsequent notifications spaced by the interval.
- **Resource ownership stays local.** The wait stops notification-driven
  attempts; each script's returned cleanup still removes its attached
  observers or listeners. `runWithCleanup` and `debugLog` are unchanged.
  The obsolete `retryUntil` export and source/test call sites are removed.

## Caller receipts

| Caller                                                       | Source                             | Preserved behavior / deliberate correction                                                                                                              |
| ------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [YouTube Music](/src/connectors/youtube-music-dom-inject.ts) | `onMutations(document.body, 2000)` | Existing selectors, partial observation and metadata cleanup remain; disposal now prevents late reattachment.                                           |
| [Telegram K](/src/connectors/telegram-k-dom-inject.ts)       | `onMutations(document.body, 1000)` | Preserves mutation wake-ups and listener cleanup. Its condition is actually a controller global; a quiet assignment alone still does not wake the wait. |
| [JWPlayer](/src/connectors/jwplayer-dom-inject.ts)           | `every(2000)`                      | Restores time-driven SDK readiness, including late methods on a partial player; retains the actual-attachment cleanup guard.                            |
| [Deezer](/src/connectors/deezer-dom-inject.ts)               | `every(1007)`                      | Initial attempt plus six retries, original warning, event subscriptions and deferred messages remain.                                                   |
| [MusicKit](/src/connectors/musickit-dom-inject.ts)           | `every(100)`                       | Retains optional SDK-method guard, captured instance, initial state send and three-listener cleanup.                                                    |
| [Webhook auth](/src/connectors/webhook-auth-dom-inject.ts)   | `every(1000)`                      | Retains missing-getter guard, accepted-state check, confirmation message and state transition.                                                          |

**Deezer's terminal result means finished waiting, not necessarily attached.**
Its local attempt counter permits seven checks. Readiness is checked before
exhaustion, so attachment on the sixth retry is allowed. Only that ready branch
adds listeners. Otherwise the seventh failure warns and returns true to stop
the wait; later globals cannot revive it. This keeps the bound local rather
than adding a generic retry-policy surface or an unused result protocol.

## Verification

- Targeted Vitest: **36/36** (16 helper and 20 actual page-script tests).
  Covers inert sources, independent immediate attempt, leading/trailing
  scheduling, successful and external disposal, queued trailing suppression
  after success/disposal, synchronous subscription safety, DOM-quiet SDK
  readiness, JWPlayer partial initialization, Deezer exhaustion/final retry,
  Telegram's actual wake-up semantics and YouTube Music's interval/cleanup.
- Full `npx vitest run`: **2199/2199**, twelve files, including existing
  connector build-watch routing tests. No watch/dev process was started.
- Both TypeScript projects passed: `npx tsc --noEmit` and
  `npx tsc --noEmit --project tsconfig.connectors.json`.
- ESLint and final Prettier checks passed for all nine changed TypeScript files.
- One-shot esbuild used the existing connector command plus a diagnostic
  metafile: **374 independent entry artifacts**, zero output import edges,
  eleven inlined lifecycle consumers and no orphan helper entry.
- TypeScript syntax-tree source comparison with `24d0a2a6` confirmed exact
  `runWithCleanup`, `debugLog` and private `throttle` function text matches.

## Remaining limits

Telegram deliberately retains a mutation-only wake-up source despite its
global predicate; attribute/text changes and time alone do not notify.
Successful discovery is one-shot, not reconciliation of replaced player nodes
or SDK instances. Existing global-based listener removal and Deezer's deferred
message timeouts are not redesigned here. Throwing host APIs and partially
completed listener installation are not generically recovered.

No authenticated live-site test or full extension distribution build was run.
Fake-time unit tests and independent-entry bundling establish the stated
properties, not compatibility with every live site's current behavior.
