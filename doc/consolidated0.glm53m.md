---
type: Report
title: Consolidated page-world lifecycle module and connector migration
description: Landing of src/core/content/page-lifecycle.ts and the migration of all eleven page-world connector scripts onto it — six wait/retry sites onto retryUntil, nine cleanup boilerplates onto runWithCleanup, with the three surveyed bugs resolved.
resource: /doc/consolidated0.glm53m.md
status: draft
author: rektide
generated:
  at: 2026-10-29
  by: model:glm-5.3
sources:
  - resource: opencode://ses_e762efd41ffepLa3WU1tRBYnZM
    title: Implementation of the module, migrations, checks, and smoke test on the consolidated workspace
  - resource: opencode://ses_e76ab1d35ffe5rfIc6T3xll18h
    title: Mission direction, spec alignment, and workspace setup for the consolidated variant
  - resource: /doc/dom-inject-lifecycle.md
    title: Ecosystem survey grounding the module surface and migration list
  - resource: /src/connectors/youtube-music-dom-inject.ts
    title: Reference implementation (trailingTimer, retryUntil, cleanup IIFE) taken from revision ytm-new and ported into this file
tags:
  - dom-inject
  - page-world
  - connectors
  - lifecycle
  - consolidated
---

# Consolidated page-world lifecycle module and connector migration

The `consolidated-20261029` branch lands the extraction the
[ecosystem survey](/doc/dom-inject-lifecycle.md) proposed: a shared,
leaf, world-agnostic lifecycle module under `src/core/content/`, and the
migration of every page-world connector script onto it. Four work
commits on top of `master@origin`; no pushes; bookmarks `ytm-new` and
`dom-inject-ecosystem-20261029` untouched.

| Commit | Work |
|---|---|
| `npqsnkku` / ffda6733 | feat: add shared page-world lifecycle module |
| `xmqmoswv` / f5130a59 | feat: migrate youtube-music page script to shared lifecycle |
| `yxsyxvnv` / b0f2a0b0 | refactor: migrate five page scripts to shared retryUntil |
| `stvsqxxz` / 5916267b | refactor: migrate remaining page scripts to runWithCleanup |

The grounding survey [`doc/dom-inject-lifecycle.md`](/doc/dom-inject-lifecycle.md)
is imported onto this branch verbatim from the
`dom-inject-ecosystem-20261029` bookmark (where it was written) so this
branch's citations resolve; the bookmark itself is untouched.

## The module — `src/core/content/page-lifecycle.ts` (new, 135 lines)

Four exports, no imports, no extension APIs:

- `debugLog(message, level?)` — console logging with a `web-scrobbler:`
  prefix, for page-world call sites that cannot reach the isolated-world
  `Util.debugLog` (which reads extension storage).
- `runWithCleanup(setup)` — the generation contract: invoke a prior
  `window.cleanup` if present, run `setup`, install its return as the new
  `window.cleanup` (`src/core/content/page-lifecycle.ts:33-43`).
- `throttle(fn, interval)` — leading-plus-trailing with a `run`/`stop`
  handle; owns all time math (`lastRun`, `remaining`,
  `src/core/content/page-lifecycle.ts:63-100`). One deliberate addition
  over the reference: a leading-edge run also cancels any pending
  trailing timer, which the standalone surface needs but the reference
  could never reach (a pending trailing timer always fires at the exact
  moment the gate reopens, so the two never raced there).
- `retryUntil(attempt, interval)` — body `childList`+`subtree`
  MutationObserver feeding the throttle, immediate first attempt,
  stop-on-success returns the stop function
  (`src/core/content/page-lifecycle.ts:112-135`). Composed on `throttle`;
  no parallel timer machinery. `trailingTimer` stays private per the
  survey's design commitment.

## Migrations, per file

**Wait/retry sites → `retryUntil`** (six):

- `youtube-music-dom-inject.ts` — the reference case. Ports the `ytm-new`
  rework (wait for `#play-pause-button` plus
  `.content-info-wrapper, ytmusic-track-info`, observe whichever exist,
  send once both do); its local `trailingTimer`/`retryUntil` pair and the
  inline cleanup boilerplate are deleted in favor of the module
  (`retryUntil(tryAttach, 5000)` at `src/connectors/youtube-music-dom-inject.ts:69`).
- `deezer-dom-inject.ts` — the recursive `setTimeout` chain, broken
  `retries` bound, and both free-variable `Util` references are gone
  (attempt at `src/connectors/deezer-dom-inject.ts:19-30`, interval
  1007 ms preserved). The reachable `Util` warning at the old `:155`
  becomes `debugLog` (`src/connectors/deezer-dom-inject.ts:148`), fixing
  the ReferenceError that silently swallowed unrecognized media types.
  Cleanup now stops the retries before unsubscribing, closing the
  re-injection zombie-listener window. Both FIXME tripwires resolved.
- `jwplayer-dom-inject.ts` — `setInterval` poll → `retryUntil(..., 2000)`
  (`src/connectors/jwplayer-dom-inject.ts:71-88`); the variant cleanup
  boilerplate → `runWithCleanup`; cleanup stops the retries and no longer
  throws when the player never loaded.
- `musickit-dom-inject.ts` — the promise-wrapped 100×100 ms poll is
  replaced by `retryUntil(..., 100)` capturing the instance
  (`src/connectors/musickit-dom-inject.ts:50-62`). See deviations.
- `webhook-auth-dom-inject.ts` — gains the full cleanup contract
  (`runWithCleanup` + `stopRetrying`), killing the interval that stacked
  on every re-injection; attempts stop once login is confirmed
  (`src/connectors/webhook-auth-dom-inject.ts:23-44`). The
  `declare interface Window` became `declare global` because the import
  makes the file a module.
- `telegram-k-dom-inject.ts` — hand-rolled body observer → `retryUntil`
  with an immediate first attempt (`src/connectors/telegram-k-dom-inject.ts:80-92`);
  cleanup no longer throws when the controller never appeared.

**Cleanup boilerplates → `runWithCleanup`** (remaining five):
`eggs`, `gensokyoradio`, `hearthis-at`, `ilovemusic`, `vk` — setup and
cleanup bodies unchanged; each file's copied `if ('cleanup' in window …)`
prologue and IIFE assignment become the shared helper. Files that used
`export {}` solely to enable `declare global` (jwplayer, ilovemusic)
drop it in favor of the real import.

## Deviations from spec, with reasons

1. **youtube-music ports `ytm-new` content.** The workspace is based on
   `master@origin`, whose youtube-music script has no local
   `retryUntil`/`trailingTimer` to delete. The spec's instruction that
   this file's "local retryUntil/trailingTimer delete in favor of the
   module" only composes with the `ytm-new` implementation, so that
   commit carries the selector rework plus the module swap together.
   Consequence: this branch and `ytm-new` both change this file; the
   fork's PR story will need `ytm-new` landed first or this branch
   replacing it.
2. **musickit restructures the data path, not just the wait.** The old
   wait lived inside `getInstance()`, awaited by `sendEvent`,
   `getTrackInfo`, `instanceIsPlaying`, and cleanup. With the wait
   externalized to `retryUntil`, the instance is captured at retry
   success and passed directly; the promise chain collapses to
   synchronous reads. PostMessage payloads, event names, and
   subscribe/unsubscribe behavior are unchanged. The 100-attempt bound
   is dropped — `retryUntil` is unbounded until found, the same contract
   the survey ascribes to all six sites.
3. **deezer's unreachable failure branch is not preserved.** The
   `retries < 6` failure warning had no live behavior to keep (the bound
   never triggered). I read "use `debugLog` for the lost warnings" as
   applying to the surviving warning sites, which now use `debugLog`;
   the init-failure warning has no bound left to attach to and is
   dropped with the branch.
4. **Cleanup guards added in jwplayer and telegram-k.** Both originals
   would throw during `window.cleanup()` if their target global never
   appeared — and a throw inside the old generation's cleanup aborts the
   new generation's setup mid-`runWithCleanup`. The guards
   (`typeof player === 'undefined'`, `attached` flag) are the minimum
   needed for the contract these files now genuinely participate in.
5. **Interval choices for previously-unthrottled sites.** deezer 1007,
   jwplayer 2000, musickit 100, webhook-auth 1000, ytm 5000 preserve
   their originals' constants. telegram-k had none (observer on every
   mutation); it gets 1000 ms. Worst-case detection lag after the
   mutation that follows availability is one interval.

## Checks and smoke test (all truthful)

- `npx tsc --noEmit --project tsconfig.connectors.json` — exit 0 after
  every stage (baseline before changes also 0). The module is outside
  that tsconfig's `include`, but imports pull it in, so it is covered
  from stage 2 onward; stage 1 was verified with the root
  `tsconfig.json` (includes `src/**/*`), exit 0.
- `npx eslint <touched files>` — exit 0 at every stage; final pass over
  the module plus all eleven `*dom-inject*` files, exit 0.
- `npx prettier --check <touched files>` — one intermediate failure
  (three files I had formatted with multi-line single-imports); fixed
  with `prettier --write`, all subsequent checks exit 0.
- `npx vitest run tests/background/connectors.test.ts` — 1850/1850 pass
  (the suite that validates connector files; it ignores `-dom-inject.ts`
  files, so this confirms no collateral damage).
- Build smoke test — ran the exact esbuild step from
  `scripts/compile-connectors.ts:18`
  (`esbuild src/connectors/*.ts --bundle --outdir=… --tsconfig=tsconfig.connectors.json`):
  succeeded, 374 artifacts. `deezer-dom-inject.js` contains the IIFE
  wrapper (`(() => {`) and the fully inlined module (checked
  `debugLog`/`runWithCleanup`/`throttle`/`retryUntil` and the
  `web-scrobbler: ` prefix); same for youtube-music, webhook-auth,
  musickit, and vk artifacts. No page-world artifact references `Util`
  anymore. **No `page-lifecycle.js` orphan artifact is emitted** — the
  module lives outside the `src/connectors/*.ts` glob, confirming
  placement does not break the compile.
- Placement caveats that remain true (from the survey): dev HMR watches
  only `src/connectors/` (`vite.configs.ts:119`), so editing
  `page-lifecycle.ts` alone won't trigger a dev rebuild — touch any
  connector or restart the dev build. This does not affect production
  builds, which recompile everything.

## Open issues and phase-2 notes

- **Isolated-world pollers** (`echo.ts:51-60`, `musicoin.ts:84-96`) are
  untouched per spec. They are `setInterval` polls shaped exactly like
  `retryUntil` and are the obvious phase-2 migration candidates; they
  run in the isolated world, so phase 2 must first confirm the module is
  acceptable there (it is world-agnostic by construction, but those
  connectors currently import nothing at runtime — a policy question,
  not a technical one).
- **webhook-auth semantic shift**: a time-poll became mutation-driven.
  The target pages expose `wsState`/`setWSState` and are UI-driven
  (state transitions render), so bursts will fire; still, a page that
  changed state without any DOM mutation would now be missed after the
  initial attempt. If that ever materializes, `retryUntil` needs a
  heartbeat option rather than a site-local interval.
- **`throttle` is currently consumed only by `retryUntil`.** It is
  exported per spec; if no direct consumer appears by phase 2, consider
  whether the export is speculative surface.
- **`ytm-new` overlap** (deviation 1) needs a fork-side sequencing
  decision before either branch is PR'd upstream.
