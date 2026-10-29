---
type: Design
title: A lightweight content gate and deferred runtime
description: Source-grounded assessment of universal bootstrap work, generated URL dispatch choices and two-phase isolated-world loading after opt-all and positive caching.
resource: /design/content-bootstrap/bootstrap0.gpt6a.md
status: draft
generated: { by: "model:openai/gpt-6-astra#high", at: 2026-10-29 }
sources:
  - resource: "opencode://ses_e76859143ffeCSMhRqc6qxzN8a"
    title: Human corrects the assessment, selects allFrames-only activation and positive learning, and commissions a later bootstrap design; parent traces loading and records exploratory evidence
  - resource: /manifest.config.ts
    title: Static all-URL, all-frame content entry and packaged connector resources
  - resource: /vite.configs.ts
    title: Separate background, content and UI builds; one shared content entry
  - resource: /scripts/compile-connectors.ts
    title: Connector files compiled separately by esbuild
  - resource: /src/core/content/main.ts
    title: Upfront runtime imports and existing dynamic connector import
  - resource: /src/util/util-connector.ts
    title: Sequential first-match connector resolution
  - resource: /src/util/url-match.ts
    title: Runtime pattern-to-RegExp construction and native matching semantics
  - resource: /src/core/content/webhook.ts
    title: Special-route static import reaching scrobble-service
  - resource: /src/core/object/scrobble-service.ts
    title: Eager service construction and service-specific dependency graph
  - resource: /src/core/storage/wrapper.ts
    title: Storage wrapper construction starts interval-based locking maintenance
  - resource: /doc/upstreaming/oauth.md
    title: Callback relay is independent of connector discovery
  - resource: "file:///home/rektide/src/web-scrobbler-opt-all/doc/embedded-players/opt-all0.sol61x.md"
    title: Commissioned explicit-activation contract
  - resource: "file:///home/rektide/src/web-scrobbler-all-cache/doc/embedded-players/all-cache0.sol61x.md"
    title: Positive-only learned candidates and retained URL validation
  - resource: "https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts"
    title: Isolated content worlds and packaged resource access
  - resource: "https://developer.chrome.com/docs/extensions/reference/api/scripting"
    title: Targeted programmatic file injection
  - resource: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts"
    title: Per-frame shared extension globals and dynamic moz-extension module imports
  - resource: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript"
    title: Programmatic loading, host grants and cross-browser failure behavior
---

# A lightweight content gate and deferred runtime

## Purpose and standing

The desired saving is less work on every page and frame. Injection supplies a
useful foothold; eliminating injection is not the goal. The human selected two
capabilities first: explicit activation for registry entries marked `allFrames`,
then positive learning of the domains on which those connectors actually work.
Ordinary connectors remain automatic. Negative caching is excluded.

This document considers the following step: keep the universally injected
foothold small, perform URL eligibility efficiently, then load the shared player
runtime only when warranted. It is a proposal with feasibility evidence, not an
implementation commission or a claim that the opt-in/cache builds already split
the bundle. Its source baseline is commit `13d75ec8` in `web-scrobbler-teal`;
the linked implementation notes own the subsequent behavior.

## What actually happens at the baseline

1. The manifest injects `content/main.js` into every eligible matching frame.
   Its `all_frames` setting is independent of the connector's `allFrames` flag.
2. Vite builds that entry from `src/core/content/main.ts`. Its static imports
   include `BaseConnector`, the starter/controller graph, metadata processing,
   storage and special-route handlers. Evaluating the entry precedes URL rejection.
3. `main()` sends a theme update and handles OAuth/webhook routes. Otherwise,
   `fetchConnector()` calls `getConnectorByUrl(location.href)` in that frame.
4. `getConnectorByUrl()` awaits custom-pattern storage, then synchronously loops
   through connectors in registry order and each connector's patterns in order.
   The first successful pattern wins. Each `test()` constructs a new `RegExp`.
5. Only then does the content entry reject an ordinary connector inside a child
   frame, construct its runtime objects, and dynamically import the chosen
   `connectors/<file>.js`. The site-specific file was already deferred; the shared
   runtime was not.
6. The starter either observes the player or observes the document subtree and
   reruns player selectors on child-list changes while waiting for it.

There are 373 connectors and 582 built-in pattern entries, including 12
`allFrames` connectors with 19 patterns. Six connectors have no built-in patterns
and depend on user configuration. A generated built-in matcher cannot ignore
that dynamic configuration. Other matcher consumers include installation-time
injection, action-menu updates and active-tab filtering in the background.

The existing local Chrome distribution's content file was 342,207 bytes; Firefox's
was 342,239. Those are inspected artifacts, not a fresh production build or a
claim of network transfer on every visit. Browser caches can reuse code resources;
per-frame evaluation, object setup and matching remain relevant.

An independent, in-memory esbuild assessment of the source entry produced a
201,862-byte minified bundle with 150 contributing modules. It is not directly
comparable to Vite output. It confirmed that scrobbler and OAuth dependencies
reach the entry: the webhook handler statically imports `scrobble-service`, which
constructs service instances. `StorageWrapper` instances also start intervals.
Moving only the final `start()` call behind a condition does not defer these
imports or their evaluation.

## Boundaries worth preserving

**Gate:** small per-document activation state, native extension messaging,
special-route selection, and enough URL/policy handling to decide whether to
load anything else. Register the wake listener before awaiting policy so a user
press is not lost during startup. Keep this listener alive after an unmatched
URL decision. Such a decision is not a persistent negative cache.

**Dispatcher:** generated built-in matching, live custom-pattern matching,
registry order, frame eligibility, explicit grants and learned candidates.
There should be one semantic implementation of selection, even if build outputs
provide different fast paths. The generated artifact carries stable connector
IDs and registry ranks; names, labels and runtime implementations need not enter
the universal gate.

**Runtime:** `BaseConnector`, shared metadata/controller/pipeline machinery,
player observers and the selected connector's existing import. It receives the
resolved connector instead of doing the full lookup again. One document-local
activation promise covers all concurrent triggers and runtime initialization.

**Special routes:** OAuth callback and webhook support must work even when no
player is eligible. They can have their own small packaged loaders; the webhook
route must not pull every scrobbler into the gate through a static import.

An allowed candidate still needs a current URL match. A positive map is useful
history, not permission to run a connector against arbitrary paths. An unapproved
earlier embed pattern must not silently fall through to an ordinary connector
with a broader pattern, such as Spotify or Bandcamp.

## Generated matching: promising, but choose the shape with evidence

A build-generated regex can remove repeated wildcard parsing, escaping and
`RegExp` construction. The browser still compiles/JITs regex code at runtime;
generating the source does not ship a portable precompiled regex machine.

Two shapes merit comparison:

- **Boolean union:** one anchored expression answers whether any built-in pattern
  could match, followed by connector resolution only for hits. It is particularly
  attractive for cheap rejection of unrelated pages.
- **Routing expression:** ordered branches identify the winning connector. This
  can avoid a second lookup, but many capture groups have their own cost.

A third comparison is a host-indexed dispatcher with small precompiled pattern
sets and a separate bucket for wildcard-host rules. It may be cheaper than a
single large expression; it must retain the project's wildcard semantics and
priority rather than substituting browser match-pattern semantics silently.

An exploratory Node 26.6.0 run generated a 19,811-byte boolean union and a
23,005-byte routing union with named connector groups. Both agreed with the
existing matcher on 1,361 generated/hand-added URLs, including overlapping embed
paths. This corpus is useful evidence, not a proof over all inputs.

Median microseconds per warmed call, five batches of 3,000 calls after 500 warmups:

| Shape | Unrelated URL | Early YouTube match | Late RadioCult match |
| --- | ---: | ---: | ---: |
| Existing pattern conversion per test | 1229.705 | 1.729 | 1196.186 |
| Precompiled sequential patterns | 70.299 | 0.066 | 67.984 |
| Boolean union, no connector identification | 26.265 | 0.108 | 28.044 |
| Named-group routing union and group lookup | 134.841 | 11.891 | 145.437 |

The boolean row performs less work than the routing rows. These are single-process
Node microbenchmarks, excluding browser startup, cold regex compilation, storage,
messaging and custom-pattern overlays. They justify investigating the generated
predicate; they do not establish an extension speedup or rule out a better routing
generator. Scratch reproduction is at
`.test-agent/bootstrap-assessment/regex.mjs` in the inspected checkout; it is ignored
exploration, not a maintained benchmark suite.

Custom patterns need a runtime overlay refreshed on configuration changes. A
static miss cannot reject a custom-only match. To preserve priority, compare the
static candidate's registry rank with matching custom candidates rather than
always taking built-ins first. The opt-all work separately fixes the baseline's
mutation of registry arrays when appending custom patterns.

## Where should dispatch run?

**Local generated gate** puts a small predicate in each content world. Common
built-in misses can be cheap, but custom patterns, learned candidates and grants
still need a current view. Shipping the entire registry and storage machinery
into every frame would undermine the intended saving.

**Background dispatch** keeps compiled matching and configuration in one worker
instance. A tiny gate sends its startup request and receives a resolved connector
or remains dormant. This adds one message/worker interaction per frame, but avoids
repeating registry setup and compilation in each frame and fits the existing
background-owned grants/cache. Worker sleep means compilation is amortized over
a worker lifetime, not guaranteed once per browser session.

I lean toward background dispatch as the first integration shape, while keeping
a local generated prefilter available for measurement. The main saving comes
from not loading the shared runtime for irrelevant frames; choosing local versus
background matching should use cold multi-frame browser measurements, not only
the warmed regex table. Policy reads should not wait behind communication with
an unrelated content frame. Serialize durable updates, not arbitrary page waits.

## Two-phase loading is feasible

The closer fit to the existing architecture is a packaged module import:

```text
manifest injects gate.js
  -> dispatcher resolves an eligible connector
  -> import(runtime.getURL("content/runtime.js"))
  -> runtime.activate(resolvedConnector)
  -> existing connector-specific import and starter
```

The gate and runtime execute in the extension's isolated world for that frame.
This is not DOM insertion of a page-world script. Module exports pass an explicit
activation interface; the connector globals can still be initialized where the
existing connector modules expect them.

A real minimal Chromium 156.0.8078.4 MV3 extension experiment verified:

- the static gate loaded in a top document and a cross-origin child;
- no runtime had evaluated before an explicit native extension message;
- the gate dynamically imported a packaged runtime with a relative module
  dependency, all declared as web-accessible resources;
- each frame evaluated/started the runtime once across repeated activation;
- runtime/gate globals remained invisible to the page;
- a restrictive page CSP (`script-src 'none'`) did not prevent isolated-world
  loading.

This tests platform feasibility in a minimal extension, not the production
runtime split, Firefox or Safari. MDN documents dynamic `moz-extension:` imports
in Firefox content scripts. Its behavior with the eventual built chunks remains
a native-browser verification item. Scratch fixture and runner are under
`.test-agent/bootstrap-assessment/`.

The alternative is background `scripting.executeScript` targeting the requesting
frame/document with a packaged runtime file. That avoids making the runtime
module graph web-accessible, but requires an explicit activation handoff and
careful targeting if navigation happens during loading. It must use existing
host access, not assume user activation grants access to all embedded origins.

For either approach, inspect emitted output. A manifest content script cannot
contain static ESM imports. A multi-entry bundler can extract shared chunks and
accidentally put such imports in the gate, or hoist runtime dependencies into an
eager shared chunk. A self-contained gate build and separately built runtime
module are an understandable starting point. Runtime chunks must be packaged
and, for the dynamic-import route, appropriately web-accessible. No remote code
or `eval` is needed.

## What the next commission would need to settle

1. Select local predicate versus background-owned dispatch using the expected
   frame/URL workload, including cold worker and regex startup.
2. Select packaged dynamic import versus targeted runtime injection after native
   browser checks; preserve the existing connector-global contract.
3. Define the custom-pattern update and dormant same-document navigation wake
   behavior. A frame should not need a permanent DOM observer merely to learn its
   URL changed, nor should a previous miss permanently disable explicit wakes.
4. Measure emitted gate bytes/dependencies, runtime load counts, regex work and
   observers on unrelated, ordinary-supported, manually activated and learned
   pages. Check real extension behavior, not only a browser API shim.

The already commissioned opt-in and positive cache provide the policy. This
design changes how cheaply that policy reaches execution. It does not revive
negative caching, add automatic audibility-triggered discovery, or require a new
media-detection architecture.

## Cross-references

- [Opt-all implementation](file:///home/rektide/src/web-scrobbler-opt-all/doc/embedded-players/opt-all0.sol61x.md)
  owns activation scope and the player-work boundary that the runtime split must
  preserve.
- [Positive-cache implementation](file:///home/rektide/src/web-scrobbler-all-cache/doc/embedded-players/all-cache0.sol61x.md)
  owns origin-pair knowledge, evidence and candidate validation; the generated
  matcher should consume those candidates rather than create another policy.
- [OAuth architecture](/doc/upstreaming/oauth.md) explains the separate callback
  relay. A player-only loading condition would break that capability.
- [Bootstrap inquiry index](README.md) connects the proposal and implementation
  homes without treating this draft as an accepted architecture.
