---
type: Assessment
title: AT Protocol and RadioCult upstream readiness
description: Commit-shape review, upstream refresh, historical OAuth failure evidence and the locally verified replacement's remaining rollout constraints.
resource: /doc/upstreaming/README.md
status: draft
generated: { by: "model:openai/gpt-6-astra#xhigh", at: 2026-10-28 }
sources:
  - resource: "opencode://ses_e7b8b15c0fferGf3Etqbeu8lip"
    title: Implement and verify extension-owned OAuth and companion relay; update current readiness while preserving historical evidence
  - resource: /doc/upstreaming/oauth.md
    title: Current OAuth architecture, exact implementation revisions, checks and rollout limits
  - resource: "opencode://ses_e7ba2bd5affezqZcLye2GkxcFE"
    title: Commission and integrate upstream/OAuth work, preserve the complete assemblage, and review separately reconstructed feature histories
  - resource: /doc/upstreaming/splits.md
    title: Dated assemblage checkpoint and focused feature workspaces, layers and verification
  - resource: "opencode://ses_e7ba21be0ffeCZKevhCOYnzpbs"
    title: G rebases against upstream, fixes source-built tests and npm dependencies, then verifies types, tests and builds
  - resource: "opencode://ses_e7ba1cc5effe06Tlaoh9uMJr6t"
    title: Astra medium recovers the atcute recommendation and reproduces the transferred-session refresh failure
  - resource: /.github/CONTRIBUTING.md
    title: Upstream contribution rules and logical PR boundaries
  - resource: /AGENTS.md
    title: Current upstream checks, Conventional Commit guidance and PR labeling rules
  - resource: /doc/discovery/teal.md
    title: Existing integration discovery and historical OAuth design
  - resource: /src/core/scrobbler/atproto/atcute-client.ts
    title: Restored library-owned OAuth session record requests after the local rework
  - resource: /src/core/scrobbler/atproto/atproto-scrobbler.ts
    title: Application-owned session storage and multi-collection writes
  - resource: /src/core/scrobbler/atproto/oauth-store.ts
    title: Awaited durable storage replacing the historical synchronous shim preserved at assessment revision 738625f2
  - resource: "https://github.com/mary-ext/atcute/issues/86#issuecomment-5262426064"
    title: Mary explicitly recommends oauth-node-client for WebExtensions
  - resource: "https://github.com/mary-ext/atcute/blob/d5490616f3a5e1c90da119a6edd656561ad2f47c/packages/oauth/node-client/README.md#webextensions"
    title: Pinned atcute public-client and WebExtension setup
  - resource: "file:///home/rektide/src/web-scrobbler-github/src/routes/oauth/callback.tsx"
    title: Companion callback-only relay after the coordinated local rework
---

# AT Protocol and RadioCult upstream readiness

## Assessment

The recommended OAuth replacement is now **implemented and verified locally**:
the extension owns public `@atcute/oauth-node-client` 2.0.1 state, sessions,
refresh and callback processing; the companion relays parameters only.
See [the current OAuth account](/doc/upstreaming/oauth.md) for exact extension
and companion commits, 2,189 passing unit tests, six source-built browser tests,
packaged Chromium restart checks, and remaining limits.

This is not deployed or accepted upstream. Missing production endpoints,
coordinated website/extension rollout and live authorization/Firefox runtime
verification remain open. The combined development history is now preserved as
`teal-assemblage-20261028`; [focused feature histories](/doc/upstreaming/splits.md)
track the RadioCult series and AT Protocol reconstruction. Historical
investigation and the pre-rework verification baseline below remain evidence,
not current architecture or the focused branches' check results.

This assessment preserves the starting history by revision: original base
`577ed01d`, committed tip `c7901584`, working snapshot `0a26101b`. The original
range contains 30 commits, 47 changed files, and 13,118 added lines. Of those
lines, 10,775 are the added pnpm lockfile.

## Upstream refresh

G fetched upstream `master` and rebased the feature stack across 71 upstream
commits:

- Previous base: `577ed01dd6dbe3eb34db0e2835b31cff99bfa4c9`.
- Updated base: `48a84b9f1b2327af3abef8678e1d0691460e589e`.
- Rebased original feature tip: `a267918e` (change `poyzxowk`).
- Final code integration tip: `a21ecfd2`.

All 30 original completed changes retain their IDs, descriptions and ordering.
The connector registry preserves both upstream additions and RadioCult; the
connector class retains `Station` while adopting upstream's removal of
`BaseState`; both tsconfigs preserve explicit TypeScript imports while adopting
upstream's removal of `baseUrl`. Rebase conflicts are resolved.

G compared the pre-existing transcript, pnpm workspace changes, test result and
tracked harness assets with `0a26101b`: their working-copy contents were preserved
byte for byte. The update did not push or squash the history.

New integration commits:

| Commit | Coherent change |
| --- | --- |
| `70e00ac7` | Populate the native npm lock with feature/test dependencies |
| `40536068` | Separate Vitest and Playwright discovery; build the browser harness from source into ignored `build/` output |
| `9ad5a699` | Use production `Song` instances in browser tests instead of incomplete getter mocks |
| `5eb539c2` | Add required Promise declarations and augment Vite environment types |
| `f46b1c97` | Resolve exported packages consistently during connector typechecking |
| `a21ecfd2` | Update the test-only Playwright adapter/MSW pair together and adjust the unhandled-frame option |

The source-built browser tests initially failed with `error-other`: the old
mocks lacked `getStation()`. Real `Song` fixtures corrected that defect. The
tracked old bundles are now unnecessary to run these tests and remain a cleanup
item for the eventual submission.

### Verification

G ran the following using Node **24.21.0** and npm **11.19.0**, matching the
repository's Node policy. The final test-only dependency change reran types,
unit/browser tests, strict installation and affected-file lint; the extension
build results are from `f46b1c97` before that change.

| Check | Result |
| --- | --- |
| `HUSKY=0 npm ci --no-audit --no-fund` | Passed |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund` | Passed |
| `npm ci --strict-peer-deps` | Passed after the test-dependency update |
| `npm test -- --run` | 2,173 tests passed across 11 files |
| `npx playwright test` | Two freshly source-built Chromium tests passed against a mocked PDS |
| `npm run dist chrome` | Passed |
| `npm run dist firefox` | Passed |
| `npx tsc --noEmit --project tsconfig.connectors.json` | Passed |
| Scoped ESLint/Prettier on G's changed/resolved files | Passed |
| Stylelint, Markdown lint and circular-dependency check | Passed |
| `npm run checkts` | Passed after the test-dependency update, including connector checks |

The initial main typecheck failed on incompatible declarations between
`@msw/playwright` 0.6.7 and MSW 2. The fix pins `@msw/playwright` **0.7.0** and
`msw` **3.0.3**, with one fixture option renamed to `onUnhandledFrame`.
No typecheck suppression or peer-dependency bypass was used.

One dependency-tree issue remains: `npm ls` flags Vitest 3.2.4's mocker's optional
`msw ^2.4.9` peer against MSW 3. Strict installation and the unit/Playwright suites
pass, but compatibility with that optional Vitest browser-mocking integration
has not been established. The dependency-tree diagnostic remains unresolved.

Full ESLint still reports 3,737 errors, dominated by tracked generated bundles
and also including existing AT Protocol/UI/harness-source lint failures.
Prettier reports 16 files in G's run, including local scratch and preserved
working changes. These totals describe that checkout, not a clean submission
candidate. The retained pnpm lock also lacks upstream's new Husky/coverage
dependencies; npm's lock is consistent. Safari compilation requires macOS and
was not run. Detailed update logs are local scratch under
`.test-agent/upstream-update/`.

## Commit review

The history is understandable as construction history. Important boundaries for
an upstream presentation are:

| Concern | Existing evidence | Review consequence |
| --- | --- | --- |
| OAuth and account integration | Scaffolding starts at change `vsxklmnp`; actual writes arrive at `nuwwytrq`; session typing, polling, and storage fixes follow | Present a functioning lifecycle with its dependencies and tests, rather than the intermediate stubs and repairs |
| Teal/Rocksky records | `lzykvlxw`, `qzzqrwut`, `owpnxztn`, `srvkqxrk`, `mwpruvxy` | Keep the stable Teal lexicon and complete Rocksky field mapping in the submitted result |
| Browser test support | `kxvwxtlr` introduces Playwright/MSW and generated bundles | Tests must exercise freshly built source; generated bundles are packaging noise |
| RadioCult and station metadata | `xorwktnp`, `xxlupsqt`, `yymlnsus`, `rytzmnyn`, `qtxrttps`, `zunnvqru`, `nyltuvus`, `poyzxowk` | This is a separate feature stream; its station-model and Teal-consumer dependencies should be explicit |
| Research | `workrzvo`, `pvlslmxq`, `orxplryz`, with later edits in `mwpruvxy` | Preserve design evidence locally; synthesize current contributor-facing explanations from it |

Change IDs above survive a normal rebase. The original `atproto` bookmark points
at `mquluvok`, before the record fixes and stable Teal migration. The original
`teal` bookmark points at `mwpruvxy`, before the later RadioCult metadata work.
Neither name alone identifies the complete submitted result.

Upstream asks for [one PR per logical change](/.github/CONTRIBUTING.md#submitting-pull-requests).
Prepare an AT Protocol feature PR and a separate RadioCult feature PR, making the
shared station metadata dependency visible. Tests belong with the capability
they verify. The original commit boundaries need a deliberate presentation pass
after the OAuth implementation is settled.

The updated [agent guidance](/AGENTS.md) asks for Conventional Commit subjects,
the [PR template](/.github/PULL_REQUEST_TEMPLATE.md), and exactly one category
and one versioning label. For the proposed feature split, use `new-feature` /
`minor-change` for AT Protocol and `new-connector` / `minor-change` for RadioCult,
subject to the final submitted scope.

Specific packaging work exposed by the original stack:

- `package.json` added dependencies without updating `package-lock.json`, even
  though upstream CI installs with `npm ci`.
- `tests/e2e/harness/dist/` contains tracked generated bundles; the original
  Playwright configuration previews them without rebuilding the source.
- `pnpm-lock.yaml` and `pnpm-workspace.yaml` introduce a second package-manager
  configuration into an npm-based upstream project.
- Starting working-copy changes include `.transcript/oauth.md`, generated
  harness output, a Playwright result file, and pnpm build approvals. These are
  pre-existing local material, not a single feature commit.

The new accounts UI also has an untranslated `Scrobble to:` heading. The existing
[discovery document](/doc/discovery/teal.md) mixes implemented behavior with old
options, including a Rocksky “TBD”; it needs an integration-specific refresh when
the OAuth choice is implemented.

## What the atcute maintainer recommended

On August 12, Mary wrote in [atcute issue 86](https://github.com/mary-ext/atcute/issues/86#issuecomment-5262426064):

> I think the best option forward might actually be to redirect WebExt use cases
> to `@atcute/oauth-node-client` instead (despite the name, it works outside of
> Node.js).

The comment explains that the browser client assumes synchronous storage.
The issue concerns the closely related `rektide/vosse` WebExtension shim; this
is an atcute maintainer recommendation, not a Web Scrobbler acceptance decision.

The benefit is **awaitable asynchronous storage**. The node-client
[Store interface](https://github.com/mary-ext/atcute/blob/d5490616f3a5e1c90da119a6edd656561ad2f47c/packages/oauth/node-client/lib/utils/store.ts)
accepts awaitable operations, so extension storage writes can complete before
OAuth proceeds. This does not itself synchronize devices or coordinate competing
refreshes. Its [WebExtension example](https://github.com/mary-ext/atcute/blob/d5490616f3a5e1c90da119a6edd656561ad2f47c/packages/oauth/node-client/README.md#webextensions)
also supplies a Web Locks `requestLock`.

The package supports discoverable public clients with
`token_endpoint_auth_method: 'none'`. It runs in the extension; it does not
require deploying a Node server. Current scrobbles already go directly to the
PDS: the website is an OAuth/session relay, not a scrobble-request proxy.

## Reproduced refresh failure

Astra medium tested the installed-version behavior in an isolated scratch
environment using `@atcute/oauth-browser-client` **4.0.1**, the actual application
localStorage shim, synthetic extension storage, an ephemeral DPoP key, and fully
stubbed fetch calls. No real account or server was used.

The transferred session is saved in the application's `AtProto` namespace.
Constructing `OAuthUserAgent(session)` does not seed the library's separate
session database. After an invalid-token response, the refresh lookup fails:

```text
Unseeded getSession: TokenRefreshError: session deleted by another tab
Unseeded handle: HTTP 401; resource calls=1; token calls=0
Seeded control: HTTP 200; resource calls=2; token calls=1
```

The positive control seeds the library store to isolate the missing-store cause.
It rotates the library's tokens successfully, while the application-owned session
copy remains unchanged. The internal helper used for this control is not a
proposed production interface.

Precision: in version 4.0.1, `handle()` reacts to the resource server's
`invalid_token` response; elapsed expiry alone does not trigger that path.
`handle()` catches the refresh failure and returns the original 401, which the
application reports as a generic createRecord failure.

Local reproduction and explanation live in
`.test-agent/oauth-library/reproduce.mjs` and its README. Commands used:

```sh
npm install --prefix .test-agent/oauth-library --ignore-scripts --no-audit --no-fund
node .test-agent/oauth-library/reproduce.mjs
```

Assertions passed on Node v26.6.0. This establishes the library/store integration
failure, not end-to-end browser authorization or service-worker restart behavior.

## Recommended OAuth implementation boundary (implemented locally)

Follow the maintained WebExtension flow as one coherent extension/website change:

1. The extension owns `OAuthClient`, durable asynchronous state/session stores,
   and refresh locking.
2. Authorization starts in the extension. Public HTTPS client metadata and a
   callback endpoint remain hosted.
3. The hosted callback forwards callback parameters to the extension, where
   `oauth.callback()` completes the exchange. The website no longer creates the
   session that the extension must import.
4. Requests use restored library-owned sessions; logout addresses the same
   session store. Replace the synchronous shim and duplicate token ownership.
5. Verify initial authorization, refresh after restart, concurrent refresh,
   persistence failure, logout, and accounts-UI updates in the supported browsers.

The existing [storage wrapper](/src/core/storage/wrapper.ts) catches write
errors. An OAuth store adapter should await the browser storage operation and
propagate persistence failures, so the library cannot mistake a failed token save
for durable success.

This is not an import-only replacement. Node-client `StoredSession` is
`{ dpopKey, authMethod, tokenSet }`, while browser-client `Session` is
`{ dpopKey, info, token }`. Preserving an existing grant requires the same client
ID, DPoP key, actual issuer/audience/scope and current tokens, plus deliberate
storage conversion. The browser session does not contain its issuing client ID.
Cross-library grant restoration has not been tested; fresh authorization avoids
requiring that compatibility bridge for the initial migration.

An additional source-level accounts-UI concern was identified before the rework:
`storeOAuthSession()` replaces the auth-started marker with the finished session,
but the focus handler in [accounts.tsx](/src/ui/options/components/accounts.tsx)
only refetches when `isReadyForGrantAccess()` finds that marker. Returning after
the callback has already finished can therefore leave the displayed resource
stale. The replacement account UI no longer uses that gate; source-built tests
now verify completion without a focus event or auth-started marker.

## Companion website dependency

On 2026-10-28, direct HTTP GETs returned **404** for all three default production
URLs configured in [oauth-config.ts](/src/core/scrobbler/atproto/oauth-config.ts):

- `https://webscrobbler.com/oauth-client-metadata.json`
- `https://webscrobbler.com/oauth/connect`
- `https://webscrobbler.com/oauth/callback`

The companion checkout at `~/src/web-scrobbler-github` now implements the
callback-only relay in local commit `96bd14c4`, retaining the development
`rektide.github.io/web-scrobbler-pages` metadata/base. Coordinate the production
metadata/callback deployment with `web-scrobbler/web-scrobbler.github.io` before
distributing the paired extension; see the current account's rollout contract.

## Related upstream request

[Web Scrobbler issue 5807](https://github.com/web-scrobbler/web-scrobbler/issues/5807)
requests Rocksky support and specifically mentions loving tracks. This branch
writes scrobble records, while `toggleLove()` is a no-op. It is relevant context
for the PR, but the current implementation does not establish that the whole
request is satisfied.
