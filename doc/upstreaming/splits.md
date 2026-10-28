---
type: Delivery
title: Focused AT Protocol and RadioCult histories
description: Preserved combined-workspace checkpoint, independent feature workspaces, shared station prerequisite and reviewed commit-series evidence.
resource: /doc/upstreaming/splits.md
status: locally-verified
generated: { by: "model:openai/gpt-6-astra#xhigh", at: 2026-10-28 }
sources:
  - resource: "opencode://ses_e7ba2bd5affezqZcLye2GkxcFE"
    title: Human commissions OAuth-first rework and independent Sol-built split histories; parent reviews boundaries, preserves the complete assemblage and assigns bookmarks
  - resource: "opencode://ses_e7b8b15c0fferGf3Etqbeu8lip"
    title: Sol xhigh implements and verifies extension-owned OAuth and the paired website relay
  - resource: "opencode://ses_e7b88eb78ffeCR6oYbG63P1bAD"
    title: Sol high reconstructs and verifies the generic station prerequisite and clean RadioCult layers
  - resource: "opencode://ses_e7b6ccdccffe4hTfEU6PzkrWbf"
    title: Separate Sol high reconstructs and verifies the AT Protocol layers, preserving OAuth and replacing MSW with native Playwright routing
  - resource: "urn:jj:commit:81942226ea5d080c8e8dc7e3d16e8827ba9d7cbd"
    title: Complete combined workspace checkpoint after the OAuth rewrite
  - resource: "urn:jj:commit:0eb87a1c0f67ec57da21a873200c97188b67dbba"
    title: Reviewed common station-model and transport prerequisite
  - resource: /doc/upstreaming/oauth.md
    title: OAuth ownership, implementation revisions, verification and rollout contract
  - resource: /doc/upstreaming/README.md
    title: Historical upstream-readiness review and original development-stack concerns
  - resource: "file:///home/rektide/src/web-scrobbler-radiocult/.test-agent/radiocult-split/README.md"
    title: RadioCult source-scope comparison and exact per-layer checks
  - resource: "file:///home/rektide/src/web-scrobbler-atproto/.test-agent/atproto-split/README.md"
    title: AT Protocol source comparison, clean dependency tree and per-layer/final verification
  - resource: "file:///home/rektide/src/web-scrobbler-atproto/doc/atproto.md"
    title: Focused contributor-facing AT Protocol guide and callback rollout contract
---

# Focused AT Protocol and RadioCult histories

## Current destinations

| Purpose | Workspace | Bookmark / revision |
| --- | --- | --- |
| Preserved combined implementation and local artifacts | `/home/rektide/src/web-scrobbler-teal` | `teal-assemblage-20261028` → `81942226` |
| RadioCult submission series | `/home/rektide/src/web-scrobbler-radiocult` | `radiocult` → `3cacceab` |
| AT Protocol submission series | `/home/rektide/src/web-scrobbler-atproto` | `atproto` → `e1267413` |

The feature workspaces share the same JJ repository. Their working directories
and npm installations are separate. The parent retains the historical assemblage
and this account; workspace-specific assessments and generated artifacts are
excluded from the focused submission histories.

Both feature workspaces have clean, empty working-copy children of their
completed tips. The parent verified the bookmark targets, shared fork point,
workspace identities and absence of the other feature's source code. The old
local `atproto` name was moved sideways only after review; its former development
history remains in the dated assemblage. Remote bookmarks were not pushed.

## Preserved assemblage

The human requested this order: complete the OAuth rewrite on the combined
branch, datestamp the complete assemblage, then make the focused feature
bookmarks. They subsequently authorized RadioCult reconstruction to begin early
in an isolated workspace; its bookmark was still deferred until preservation.

The local checkpoint **`teal-assemblage-20261028`** selects immutable commit
`81942226ea5d080c8e8dc7e3d16e8827ba9d7cbd`. The date is the local active date
confirmed with JJ operation history and the host clock on October 28, 2026.

Its parent is the completed OAuth/documentation tip
`d4e39777fc9dc9e569669e3bb2e7fc9d6e33254c`. The checkpoint explicitly saves the
previously uncommitted transcript, pnpm build-approval configuration, last test
result and tracked harness-dist changes. Their file contents were retained;
committing them here makes the whole pre-split workspace recoverable. This
archival commit is not a proposed upstream feature commit.

All original development commits remain in the preserved ancestry. Reconstructing
new reviewable feature histories does not squash or erase that evidence.
The paired website change remains commit
`96bd14c44312300581d2f10dc771c9597ee6f58e` in
`/home/rektide/src/web-scrobbler-github`; the
[OAuth account](/doc/upstreaming/oauth.md) records its contract and verification.

## Shared prerequisite and feature boundaries

Both focused histories use upstream
`48a84b9f1b2327af3abef8678e1d0691460e589e` plus the **same** prerequisite commit:

**`0eb87a1c0f67ec57da21a873200c97188b67dbba` — `feat: transport optional station metadata with songs`.**

This layer contains `Station` / `ExternalIdentifier`, optional station data on
connector state, connector/song accessors, controller propagation and generic
transport tests. It has no RadioCult implementation or AT Protocol dependency.
The parent reviewed the interface and tests, including metadata enrichment and
clearing without replacing the playing song.

RadioCult owns its player connector, public station enrichment, top-level
listening-page URL plumbing and station-name preference. AT Protocol owns
Teal/Rocksky mapping, OAuth, account UI and PDS writes, including consumption of
optional generic station data. The two bookmarks are sibling feature series
after the shared prerequisite; neither needs the other's feature code.

An upstream presentation must account for the shared prerequisite explicitly.
It can land with the first feature, after which the other feature's remaining
commits are rebased onto that accepted upstream base.

## RadioCult series

| Layer | Commit | Purpose |
| --- | --- | --- |
| Common prerequisite | `0eb87a1c0f67ec57da21a873200c97188b67dbba` | Optional station data and transport tests |
| Connector | `436f5e241c09d1cadea8edfaa2bc4d3bb130d172` | Four player variants, station parsing/enrichment, frame listening-origin support and connector tests |
| Preference | `3cacceab17353fdbf8e4c62557e2555fadab8062` | Configurable station trademark filtering, native UI/localization and option regression tests |

Sol high reconstructed these layers from immutable assemblage revision
`738625f249fdab3b4cfdfd6202ae42d0c1fb0757`. The series retains blocklisting,
fallback identity, provider/social identifiers, AM/FM frequency/callsign data,
station overrides and the original listening-origin priority.

The generic `getOption()` API keeps its boolean/default-false behavior;
RadioCult explicitly supplies a default of true. This avoids carrying the
original broad optional-boolean change into unrelated connectors. Native
package manifests, npm lock and tsconfigs remain identical to upstream.

### RadioCult verification

Reported by its implementing agent on Node **24.21.0** / npm **11.19.0**, with
private installed dependencies:

- Types and Chrome builds passed at every layer.
- Full unit suites progressed from **2,164** to **2,190** to **2,197** passing
  tests as the layers were added.
- Final full native lint passed all five checks.
- Final Chrome and Firefox distribution builds passed.
- Native npm install, strict-peer installation dry-run and
  `npm ls --omit=optional` passed.
- Read-only checks of the public station API and player HTTP response succeeded.

The tests exercise actual connector/controller/song transport, deterministic
DOM/media fixtures, failure fallback and preference migration. Installed-extension
live playback and Safari compilation were not exercised. Parent review checked
the production boundaries and test intent without redundantly rerunning the
agent's successful checks.

## AT Protocol series

Completed by a separate Sol high after the OAuth rewrite and assemblage
checkpoint. Its archived feature source is `81942226`, with extraction reads
bound to the identical production-code tip `d4e39777`; the exact common base
is `0eb87a1c`.

| Layer after the common prerequisite | Commit | Purpose |
| --- | --- | --- |
| Records | `1b2c1efcaba60c788eb7cef935880eadf0a27711` | Stable Teal/Rocksky mapping, destination vocabulary and mapping tests |
| Complete feature | `0316c77504b6a9356d1b81132969e471b8afa3e5` | Durable extension-owned OAuth, scrobbler, account UI, localized labels, callback boundaries and native unit coverage |
| Browser verification | `e1267413e77b12c2ddaf93ae5586bb6643757106` | Source-built Chromium harness, native network routing, six browser cases and contributor guide |

The production AT Protocol modules, content callback relay and account component
are byte-for-byte equal to the reviewed OAuth result. Parent comparison verified
that boundary directly. RadioCult connector/options/localization and its
`getTabUrl` / `topLevelUrl` plumbing are absent. Generic station consumption is
retained through the common prerequisite; tests use neutral station fixtures.

The split replaces MSW and its adapter with Playwright's native request routing.
All six substantive browser cases remain, record captures are isolated per test,
and unmocked external HTTPS requests fail. This removes the optional Vitest/MSW
peer mismatch without changing upstream's Vitest or TypeScript configurations.
Mapping coverage is expanded, and five scrobbler checks cover destination
selection, native failure results, explicit legacy cleanup and no-op features.

Only required dependencies are added. The agent's lock comparison found no
changes to existing upstream package entries and no atcute resolution differences
from the archive. The unused direct `@atcute/client` dependency is omitted;
test-imported OAuth crypto is a development dependency. No generated bundles,
pnpm files, transcript, result files or workspace assessments enter this series.

### AT Protocol verification

Reported by its implementing agent on Node **24.21.0** / npm **11.19.0**:

- Relevant types/tests/lint and Chrome builds passed at each semantic layer.
- Final real clean `npm ci --strict-peer-deps` and `npm ls --all` passed.
- Both native TypeScript projects and all five native linters passed.
- **2,189 unit tests** across 14 files and **six source-built Chromium tests**
  passed after the clean install.
- Chrome and Firefox distributions passed.
- A freshly packaged Chromium smoke check passed native storage/Web Locks,
  storage-driven account updates, full browser restart and signout preserving
  preferences. It used a synthetic session, not a live account authorization.
- Native Markdown and knowledge-document checks passed for the
  [contributor guide](file:///home/rektide/src/web-scrobbler-atproto/doc/atproto.md).

No blocking local dependency, build, type, test or lint issue is known for the
focused series. Parent review checked production equality, the replacement
network fixture, record/error tests, native dependency changes and the contributor
contract. It did not redundantly rerun the successful agent checks.

## Rollout boundary

The [OAuth implementation account](/doc/upstreaming/oauth.md#browser-and-rollout-contract)
and [companion contract](file:///home/rektide/src/web-scrobbler-github/doc/oauth.md#coordinated-rollout)
remain prerequisites for an AT Protocol release. Production metadata/callback
hosting and real authorization are not established by a successful local build.
Bookmarks are local delivery references; no feature push or PR has been made.
