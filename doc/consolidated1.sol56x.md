---
type: Assessment
title: Accepted page-world lifecycle pattern — departing assessment
description: Faithful port of the operator-approved throttle and retryUntil, verified caller compatibility and standalone build grounding, and the remaining lifecycle limits and upstream novelty of the consolidated migration.
resource: /doc/consolidated1.sol56x.md
status: draft
author: 'model:openai/gpt-6.1-sol#xhigh'
generated:
    at: 2026-10-30
    by: 'model:openai/gpt-6.1-sol#xhigh'
sources:
    - resource: opencode://ses_e75ceb8aaffeVHdqHMb9ed07QL
      title: Port the accepted pattern, assess lifecycle tradeoffs, and verify all connector imports, independent build outputs and harness-provided sharing for the follow-up
    - resource: opencode://ses_e76ab1d35ffe5rfIc6T3xll18h
      title: Commission the consolidated lifecycle update and departing assessment under the operator-frozen design
    - resource: /src/core/content/page-lifecycle.ts
      title: Shared module updated in commit 78c44801; throttle and retryUntil bodies compared with ytm-new at 871e7c97
    - resource: /doc/consolidated0.glm53m.md
      title: Prior migration report, original cancellation contract, per-connector changes and verification baseline
    - resource: /doc/dom-inject-lifecycle.md
      title: Original ecosystem survey and rationale for shared page-world helpers
    - resource: /src/connectors/youtube-music-dom-inject.ts
      title: DOM-driven attachment caller; accepted helper source separately read from ytm-new at 871e7c97
    - resource: /src/connectors/deezer-dom-inject.ts
      title: Global readiness, event subscriptions and deferred messages
    - resource: /src/connectors/jwplayer-dom-inject.ts
      title: Global readiness, partial player initialization and subscription cleanup
    - resource: /src/connectors/musickit-dom-inject.ts
      title: Instance capture and event subscription lifecycle
    - resource: /src/connectors/webhook-auth-dom-inject.ts
      title: Approval state transition and confirmation side effects
    - resource: /src/connectors/telegram-k-dom-inject.ts
      title: Controller discovery and event subscription lifecycle
    - resource: /scripts/compile-connectors.ts
      title: Exact esbuild compilation command and connector entry glob
    - resource: /vite.configs.ts
      title: Connector-only development watch directory
    - resource: /src/connectors/connector.d.ts
      title: Ambient connector globals and type-only references, not runtime core imports
    - resource: /src/core/content/main.ts
      title: Harness imports core modules, installs globals and dynamically loads the selected connector artifact
    - resource: /src/connectors/archive.ts
      title: Type-only cross-connector import and separate page-world script injection
    - resource: /src/core/content/connector.ts
      title: Connector.injectScript delegates loading of a separate page-world artifact
    - resource: /src/core/content/util.ts
      title: Page-world loading via script.src rather than an ES module import between connectors
tags:
    - page-world
    - lifecycle
    - consolidated
    - assessment
---

# Accepted page-world lifecycle pattern — departing assessment

The shared module is worth keeping. It gives eleven independently bundled
page scripts one maintained cleanup idiom, and six of them one readable
retry mechanism, without depending on isolated-world extension globals.
The accepted throttle is particularly easy to inspect: one timestamp, one
timer, one executor, one returned function. The trailing callback and an
elapsed-window leading call both clear the same handle before invoking
the work. That is a useful simplification, not merely fewer lines.

My reservation is about **what the abstraction promises across these
different sites**, not the value of extracting it. Disconnecting an
observer is weaker than cancelling pending work; DOM mutations are weaker
than a general readiness signal. The migration must be judged with both
limits visible.

## Delivered scope and compatibility

Code commit **`78c44801`** (`unnvkrxq`),
`fix: align page lifecycle helpers with the accepted pattern`, changes only
[`page-lifecycle.ts`](/src/core/content/page-lifecycle.ts).
The accepted source was read with:

```sh
jj file show -r ytm-new src/connectors/youtube-music-dom-inject.ts
```

At inspection, `ytm-new` selected **`871e7c97`**. TypeScript syntax-tree
extraction verified that both ported function bodies match that source
exactly. `throttle` returns the named bare `runThrottle`; `execute` is the
guarded timer-clearing trailing callback. `retryUntil` uses inline named
`tryOnce`, a positive success conditional, the bare observer callback,
an immediate call and the bound observer disconnect return.

`runWithCleanup` and `debugLog` are unchanged. Module comments now describe
the uncancellable trailing run and the disconnect-only return honestly.
No connector needed a compatibility edit: all six retry callers already
hold and invoke a function; none uses a throttle object, array handle,
`.run` or `.stop`. A source-tree search confirmed that the module's only
`throttle` caller is `retryUntil`; `Util.throttle` is separate and untouched.

The additional `runWithCleanup` callers —
[`eggs`](/src/connectors/eggs-dom-inject.ts),
[`gensokyoradio`](/src/connectors/gensokyoradio-dom-inject.ts),
[`hearthis-at`](/src/connectors/hearthis-at-dom-inject.ts),
[`ilovemusic`](/src/connectors/ilovemusic-dom-inject.ts) and
[`vk`](/src/connectors/vk-dom-inject.ts) — consume neither changed helper.
Their setup/cleanup bodies remain intact.

This supersedes the `run`/`stop` surface and strong retry-cancellation
claims in the [previous migration report](/doc/consolidated0.glm53m.md).
In particular, that report's claim that Deezer's zombie-listener window
was closed is no longer generally true with the accepted contract.
The [original survey](/doc/dom-inject-lifecycle.md) explains the worthwhile
extraction, but its cancel-handle proposal is historical, not current law.

## Build grounding and upstream novelty — follow-up

**Yes: connector scripts are independent build artifacts, with no shared
chunks or runtime module imports between their emitted files. No: that
does not mean they are self-sufficient programs, or that their sources
contain no imports after this migration.**

### Independent entries; imports are inlined, not shared at runtime

[`scripts/compile-connectors.ts:16–18`](/scripts/compile-connectors.ts)
passes `src/connectors/*.ts` as separate esbuild entries with `--bundle`.
It does not enable splitting or a shared connector entry. Lines 30–34
move those outputs into the browser's connector directory; there is no
subsequent connector linking step there. The directory is currently flat:
**374 matching `.ts` files = 362 isolated-world scripts + 11 page-world
scripts + `connector.d.ts`**. Literally "every file" needs qualification:
`eslint.config.js` is build-tool configuration, not a matched connector
entry; the matched declaration file produces an empty `connector.d.js`
IIFE, not a useful connector.

I reran the actual command with only a diagnostic metafile added:

```sh
npx esbuild src/connectors/*.ts --bundle --outdir=build/connectorraw --tsconfig=tsconfig.connectors.json --metafile=build/connectors-grounding-meta.json
```

Metafile checks found **374 outputs, each with its own corresponding
`entryPoint`; zero output import edges; zero output exports; and no
non-entry/shared chunks**. Every isolated-world output has only its own
source file as an input. Exactly eleven outputs additionally contain
`src/core/content/page-lifecycle.ts`, each as its own inlined copy.
For generated-code receipts, `build/connectorraw/deezer-dom-inject.js:3–49`
contains that copy; `build/connectorraw/archive.js:5,23,33` instead references
ambient `MetadataFilter`/`Connector` and requests its separate page script.
These ignored build files/metafile are diagnostic output, not new tracked
deliverables.

A TypeScript AST scan of all 374 source entries found **eleven runtime
import declarations, all in page-world scripts, all importing only
`@/core/content/page-lifecycle`**. The complete import-site receipts are:

- `src/connectors/deezer-dom-inject.ts:13–17`,
  `src/connectors/eggs-dom-inject.ts:13`,
  `src/connectors/gensokyoradio-dom-inject.ts:13`,
  `src/connectors/hearthis-at-dom-inject.ts:13`;
- `src/connectors/ilovemusic-dom-inject.ts:1`,
  `src/connectors/jwplayer-dom-inject.ts:1`,
  `src/connectors/musickit-dom-inject.ts:13`,
  `src/connectors/telegram-k-dom-inject.ts:34`;
- `src/connectors/vk-dom-inject.ts:13`,
  `src/connectors/webhook-auth-dom-inject.ts:1`,
  `src/connectors/youtube-music-dom-inject.ts:13`.

There are **zero isolated-world runtime imports**, zero runtime imports
from another connector file, and no runtime re-exports, dynamic imports or
`require()` calls anywhere in these `.ts` entries. Nine import declarations
are type-only, including
[`archive.ts:3`](/src/connectors/archive.ts)'s import from
`./jwplayer-dom-inject`; those do not load or inline that script.
`export {}` and `typeof import(...)` type expressions likewise do not
create runtime module dependencies. The uncompiled ESLint configuration's
own import is not a connector-script counterexample.

### Isolated-world sharing is supplied by the harness

[`src/connectors/connector.d.ts:1–8`](/src/connectors/connector.d.ts)
declares `Connector`, `Util`, `MetadataFilter`, `webScrobblerScripts` and
`STARTER_LOADED`; it provides types, not implementations. The actual core
modules are imported by
[`src/core/content/main.ts:1–5`](/src/core/content/main.ts), assigned to
`window.Connector`, `window.Util` and `window.MetadataFilter` at lines
47–50, **before** the selected `connectors/${connector.js}` artifact is
dynamically loaded at line 55. The harness has its own Vite content build
([`vite.configs.ts:66–85`](/vite.configs.ts)); core implementations are not
rebundled into the individual isolated-world connectors.

Thus the isolated connectors' shared-core interface is ambient globals
supplied by that separately built harness, not connector-to-core source
imports or shared connector chunks. Do not extend "no runtime imports"
to the harness itself: its dynamic import is the connector loading path.
Likewise, [`archive.ts:60`](/src/connectors/archive.ts) loads the separate
JWPlayer page-world artifact through `Connector.injectScript`
([`connector.ts:521–531`](/src/core/content/connector.ts)), which sets a
`script.src` through [`util.ts:766–773`](/src/core/content/util.ts).
Independent artifacts do not imply that no connector ever loads a second
artifact, or that a connector runs without its harness or host page.

### First imported shared connector code: yes, a new source convention

The checked upstream baseline, `master@origin` at **`48a84b9f`**, has the
same 374 `.ts` entries and **zero runtime imports/re-exports/import calls**
in an AST scan of their revision-bound contents (`jj file show -r
48a84b9f ...`). Combined with the current complete scan, this establishes
that **this migration introduces the first and only imported shared-code
module in the inspected connector tree**, `page-lifecycle.ts`. This is a
comparison with that baseline, not a claim to have audited every historical
revision or to have invented imports elsewhere in the application.

For upstreaming, my honest reading is: **novel connector-source pattern,
existing build capability, unchanged independent runtime packaging**. A
maintainer can reasonably question a new helper layer, its public surface,
cross-connector coupling in maintenance, missing lifecycle tests and the
development-watch gap. I would expect those questions rather than a build
incompatibility objection; I cannot predict acceptance, and found no code
establishing a prohibition on runtime source imports. Present the actual
eleven-site reuse and bug-fix rationale as an architectural proposal, not
as merely following an already established connector import convention.
No new shared-runtime loader or chunk deployment is needed. The survey's
analogy between provisioned globals and bundler-provided helpers explains
their similar purpose; it does not make them an existing common convention.

## Where it fits the six retry callers

Intervals below are preserved from the consolidated branch. Porting the
helper does not silently import the accepted source's different YouTube
Music interval (2000 ms versus this branch's 5000 ms).

| Caller                                                                | What the shared pattern serves                                                                                                                                                                        | Where it does not suffice                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [YouTube Music](/src/connectors/youtube-music-dom-inject.ts), 5000 ms | Best fit: player elements render through DOM insertion; attempts observe whichever targets exist and finish when both exist. Mutation bursts coalesce without dropping their final requested attempt. | A queued attempt can reconnect the metadata observer after cleanup. Once successful, discovery stops: later replacement of the player nodes is not repaired.                                                             |
| [Deezer](/src/connectors/deezer-dom-inject.ts), 1007 ms               | One clear readiness predicate followed by event subscriptions; retains the separate page-world logging fix.                                                                                           | `dzPlayer`/`Events` becoming ready need not insert DOM nodes. A late attempt can subscribe after cleanup. Existing one-second `sendEvent` timeouts are not tracked or cancelled either.                                  |
| [JWPlayer](/src/connectors/jwplayer-dom-inject.ts), 2000 ms           | Immediate readiness check and centralized throttling replace bespoke polling machinery.                                                                                                               | Global/API readiness without a child-list mutation is missed. A late attempt can subscribe after cleanup; partial initialization also exposes an independent cleanup bug below.                                          |
| [MusicKit](/src/connectors/musickit-dom-inject.ts), 100 ms            | Captures an available instance once and gives synchronous event readers a stable reference.                                                                                                           | SDK readiness is not inherently a DOM event. A stale attempt can attach listeners after cleanup; replacing the instance after success is not handled. The former finite wait bound was already removed by the migration. |
| [Webhook auth](/src/connectors/webhook-auth-dom-inject.ts), 1000 ms   | Immediate check, stop observing after confirmation, and no permanently running approval interval. `Confirmed` naturally reduces duplicate confirmations.                                              | A pure `wsState` transition, attribute change or text-node update is not a trigger. A pending attempt may still confirm after cleanup; the first `wsState()` call must already be safe.                                  |
| [Telegram K](/src/connectors/telegram-k-dom-inject.ts), 1000 ms       | The immediate attempt improves the former observer-only discovery when the controller already exists; mutation bursts are bounded.                                                                    | A controller appearing without DOM insertion is still missed. A queued attempt can add listeners after cleanup. Cleanup reads the current controller rather than retaining the subscribed object.                        |

These are code-derived limits, not claims that the live sites currently
exercise every failure path. No authenticated live-site verification was
performed in this session.

## The two important semantic limits

### Disconnect is not a generation barrier

A deterministic probe of the actual compiled JWPlayer bundle exercised:

1. Initial attempt finds no player.
2. A child-list mutation inside the throttle window schedules a retry.
3. Generation cleanup disconnects the retry observer; no player was
   assigned, so there is nothing to unsubscribe.
4. The player appears before the queued timeout fires.
5. That timeout still adds both event subscriptions.

The trailing work is bounded — this is not a surviving infinite retry
loop — but its **effects need not be bounded**. Old-generation listeners
can outlive cleanup, alongside a new generation's listeners, without
another automatic cleanup of the old closure. YouTube Music can similarly
reactivate a disconnected observer. Webhook confirmation has a different,
less persistent side effect; it should not be described as the same leak.

Ordinary success does not inherently cause an extra attempt: `execute`
has cleared the pending handle before `tryOnce` disconnects. The important
gap is external cleanup while a trailing attempt is already queued.
The accepted design knowingly allows that gap; this port preserves it.

### An interval is a rate limit, not a polling period

After the immediate attempt, only body `childList` mutations, including
descendants, request more work. Attributes, character data, SDK/global
assignment and time passing do not. There is no heartbeat. A trailing
timer drains a requested burst; it does not keep retrying on its own.

That is a natural fit for YouTube Music's inserted elements and a plausible
fit for Telegram's existing mutation-driven discovery. For Deezer,
JWPlayer, MusicKit and webhook auth, replacing a time poll with this helper
changed the readiness trigger, not just its implementation. The previous
report already noted webhook's risk; the same reasoning applies to all
four. A temporary quiet-global probe confirmed no additional attempt even
after ten seconds and an attribute-only mutation; a later child-list
mutation triggered the successful attempt immediately.

## Other surface and integration concerns

- **No committed lifecycle regression tests.** The existing connector
  suite does not exercise these page-world bodies. Static checks and
  successful bundling cannot certify cleanup semantics.
- **Partial initialization still matters.** In JWPlayer, `player` can be
  assigned while `player.on` is absent. The attempt returns false, but
  cleanup only checks whether `player` was assigned and then calls
  `player.off`. A compiled-bundle probe with an unready `{}` player
  reproduced `player.off is not a function`. This is not caused by the
  final throttle change.
- **The wrapper is not a resource manager.** `runWithCleanup` installs its
  new cleanup only after setup returns. A throwing setup can leave partial
  resources without registering cleanup; a throwing old cleanup prevents
  new setup. The one shared `window.cleanup` slot also assumes a single
  active owner. None of this warrants silently swallowing exceptions.
- **Cleanup-only migrations are not cleanup audits.** For example, Eggs
  attaches its player listener on the non-artist branch, but its cleanup
  returns early on that branch (`!isArtistPage`). That appears to leave
  the listener attached. Sharing the wrapper preserves this pre-existing
  bug; it does not validate every returned disposer.
- **Public surface exceeds actual use slightly.** `throttle` has no direct
  external consumer today. Its export is not a demonstrated reuse win,
  although its internal separation is useful. `debugLog` appropriately
  avoids `Util`, but is unconditional console output, not the isolated
  world's storage-gated debug policy. Keep that distinction explicit.
- **Development rebuilds miss the module.**
  [`vite.configs.ts`](/vite.configs.ts) watches only `src/connectors/` for
  the [connector compiler](/scripts/compile-connectors.ts). Editing the
  shared module alone does not trigger that rebuild. Production compilation
  does inline it correctly. An apparently stale development test is a
  predictable maintenance trap here.

## Improvements I would make next — deliberately not made here

1. **Commit focused fake-time/observer and reinjection tests first.** Cover
   the leading/trailing boundary, reopening after a trailing run, clearing
   a delayed timer on an elapsed leading call, immediate success,
   disconnect-before-timeout and partial initialization. Make the accepted
   post-disconnect behavior an explicit test expectation, not an accidental
   promise of stronger cleanup. Add shared-module development watch coverage.
2. **Match readiness triggers to each site.** Verify whether each SDK has
   a reliable readiness event; where it does not, choose explicit polling
   for genuinely time-driven discovery. Keep DOM-driven retry for DOM
   discovery. I would not start by adding a large generic options object
   to the accepted helper.
3. **If the freeze is reopened, suppress stale side effects.** A small
   active-generation guard inside `retryUntil` could turn an already queued
   callback into a no-op after disposal without restoring a public throttle
   handle. That would change the accepted retry contract, so I did not add
   it, a hidden cancellation path, or per-connector substitutes in this port.
4. **Repair concrete connector cleanup separately.** Retain the actual
   subscribed API target, track whether subscriptions completed, fix the
   JWPlayer partial-player and Eggs branch guards, and own Deezer's deferred
   send timers. Review node/instance replacement only where site behavior
   requires it. These are targeted follow-ups, not grounds to discard the
   shared work or inflate its wrapper into a framework.
5. **Resist premature surface expansion.** Consider making the unused
   throttle export private only in a separately agreed API review. Do not
   merge it with `Util.throttle` merely because the names match: the
   isolated helper returns callback results and has different timer code.

The module's implementation was operator-frozen; the task was a faithful
port and assessment. No readiness policy, connector interval, cleanup
guard, public export, build configuration or test-suite design was changed
as an unsolicited improvement.

## Verification receipt

- `npx tsc --noEmit --project tsconfig.connectors.json` and root
  `npx tsc --noEmit`: passed at both delivery stages.
- ESLint and Prettier: passed for the module and all eleven inspected
  page-world scripts. These include unchanged callers, not just the edited
  module.
- Exact esbuild step from `scripts/compile-connectors.ts`:
  `npx esbuild src/connectors/*.ts --bundle --outdir=build/connectorraw --tsconfig=tsconfig.connectors.json`:
  passed, **374 artifacts**. All eleven lifecycle consumers contain their
  inlined helper code in an IIFE, with no runtime import or `Util` reference.
  All six retry bundles contain the accepted functions; cleanup-only bundles
  omit them. No orphan `page-lifecycle.js` entry is emitted.
- `npx vitest run tests/background/connectors.test.ts`: **1850/1850 passed**.
  This is collateral connector-definition validation, not lifecycle coverage.
- Eight temporary Node VM probes passed: burst coalescing and reopening;
  delayed-timer clearing; immediate success and bound disconnect; a trailing
  attempt surviving disconnect; quiet-global/attribute-only non-readiness;
  cleanup-before-next-setup ordering; actual JWPlayer late subscription;
  and actual JWPlayer partial-initialization cleanup failure. The last two
  assert the observed hazards, not their absence. Fake time and a minimal
  observer stub are narrower evidence than a browser test. Scratch probes
  are not part of the delivered regression suite.
- This assessment passed `rkt check --okf`, Remark and an explicit Prettier
  check with `--ignore-path /dev/null` (the repository normally ignores
  Markdown for Prettier). Links, frontmatter and session provenance were
  checked, not the truth of every semantic claim.

The code and this assessment are separate coherent commits on
`consolidated-20261029`; no push is part of this delivery.
