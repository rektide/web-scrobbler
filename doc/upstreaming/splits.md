---
type: Delivery
title: Focused AT Protocol and RadioCult histories
description: Preserved combined-workspace checkpoint, independent feature workspaces, shared station prerequisite and reviewed commit-series evidence.
resource: /doc/upstreaming/splits.md
status: locally-verified
generated: { by: "model:openai/gpt-6-astra#xhigh", at: 2026-10-28 }
sources:
  - resource: "opencode://ses_e76b14bfcffeBWpTR6f6Qu87ed"
    title: Human confirms station capture as the upstreamable core; session audits novelty, inverts into standalone features with ident stacks, relates the transport to upstream issue #1882 and draft PR #4434, and pushes the set
  - resource: "opencode://ses_e76975a22ffem1n0BbzYE4n6dC"
    title: Sol high inverts the RadioCult series so the connector ships without station content and radiocult-ident stacks above
  - resource: "opencode://ses_e76975931ffeWuZ1P5GHKBNHNS"
    title: Separate Sol high strips station consumption from the AT Protocol series and stacks atproto-ident above
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
| Station identity transport alone | shared repository | `ident` → `0480b542` |
| RadioCult submission series (no station content) | `/home/rektide/src/web-scrobbler-radiocult` | `radiocult` → `60b5fc0d` |
| RadioCult station identity stack | same workspace, above `radiocult` | `radiocult-ident` → `1e775c81` |
| AT Protocol submission series (no station content) | `/home/rektide/src/web-scrobbler-atproto` | `atproto` → `e3cb58e6` |
| AT Protocol station identity stack | same workspace, above `atproto` | `atproto-ident` → `03a4f350` |

The dependency direction was inverted on 2026-10-29 so each feature ships
without the station work: `radiocult` and `atproto` contain zero
station-identity content and descend directly from upstream
`48a84b9f1b2327af3abef8678e1d0691460e589e`; each `-ident` bookmark is a
stack ON TOP of its feature, opening with an exact copy of the `ident`
transport patch and then that feature's station-specific commits. `ident`
itself stands alone on upstream and is shippable as a single capability
PR with no feature attached.

The feature workspaces share the same JJ repository. Their working directories
and npm installations are separate. The parent retains the historical assemblage
and this account; workspace-specific assessments and generated artifacts are
excluded from the focused submission histories.

Both feature workspaces have clean, empty working-copy children of their
completed tips. The parent verified the bookmark targets, shared fork point,
workspace identities and absence of the other feature's source code. The old
local `atproto` name was moved sideways only after review; its former development
history remains in the dated assemblage. The fork (`rektide/web-scrobbler`) received the inverted bookmark set on
2026-10-29 — `ident`, `radiocult`, `radiocult-ident`, `atproto`,
`atproto-ident` and this documentation line — force-updating the stale
pre-rework `radiocult` and `atproto` branches. No upstream pull request
has been opened from any of them.

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

## Station identity transport and feature boundaries

The transport layer now exists in three places with one identical patch:
the standalone **`ident`** bookmark
(`0480b54237feaaad63064f4b400f5ed46a8369bc`) directly on upstream
`48a84b9f1b2327af3abef8678e1d0691460e589e`, and the opening commit of
each `-ident` stack (`feb96fa6eff1` above `radiocult`, `25a3a5b7fa6f`
above `atproto`) — all `feat: transport optional station metadata with
songs`, each a jj `duplicate` of the reviewed `0eb87a1c` whose diff is
byte-identical to the standalone copy. Tree comparison against each
former series tip showed zero differences. This layer is
a deliverable in its own right, not merely a prerequisite. It gives
connectors a generic way to say which broadcast station selected the
playing track — `Station` / `ExternalIdentifier` types, optional station
data on connector state, `Connector.getStation`, controller propagation
into `song.parsed.station`, and transport tests. It has no RadioCult
implementation and no AT Protocol dependency. An upstream audit on
2026-10-29 (see session source below) confirmed nothing similar exists
upstream: core `State` carries no station field, no `getStation` exists,
and existing radio connectors treat station identity as a scraping
concern — `live365.ts` reads the station text only to subtract it from
the artist field, and `tunein.ts` reads the station URL only to swap
artist and track. `ConnectorMeta.label` is a static per-connector display
name, and `originUrl` describes a track's origin, not the selecting
station; `isPodcast` is the nearest precedent for adding a song attribute
to `State`.

RadioCult owns its player connector; its stack adds public station
enrichment, top-level listening-page URL plumbing and station-name
preference as the worked example consuming the transport. AT Protocol owns
Teal/Rocksky mapping, OAuth, account UI and PDS writes; its stack adds the
optional station consumption in play records. The standalone features
share no commits and reference no station code; the only thing the three
transport copies share is the identical patch.

Each PR can therefore carry exactly what it needs: the features land
alone, `ident` can land alone, and a `-ident` stack can land as one
combined feature-plus-capability PR. Whichever transport copy lands first
accepts the patch upstream; the others drop out on rebase.

### Relation to upstream issue #1882 and draft PR #4434

Upstream [issue #1882](https://github.com/web-scrobbler/web-scrobbler/issues/1882)
(open since 2019, labeled core/feature) asks for service detection beyond
URL patterns — motivated by self-hosted platforms such as Funkwhale and
any-domain embeds such as Bandcamp custom domains (#3125). Draft
[PR #4434](https://github.com/web-scrobbler/web-scrobbler/pull/4434)
answers at the detection layer: declarative DOM rules
(`meta[name=generator]`) in a new `connectors-dynamic.ts`, URL matching
tried first with DOM-rule fallback, and an inverted injection flow where
the content script decides its own connector and the background asks
tabs which connector bound. None of it has landed; master's current
answer for self-hosted platforms is manual custom URL patterns — the
Funkwhale and AzuraCast entries ship with no built-in matches.

The station transport is the payload-layer counterpart rather than an
answer to #1882: detection decides *which connector* runs; the transport
lets that connector say *which station* selected the track. The two
compose — a DOM-detected AzuraCast instance could still supply `Station`
data, and `ExternalIdentifier.authorityUri` gives a detected service
identity a data home. #4434 modifies `content/main.ts`,
`controller.ts` and `communication.ts`, which this series also touches;
the overlap is textual and mechanically resolvable, with no conceptual
collision. Notably, #4434's `getConnector` (background asks the tab its
connector) mirrors this series' `getTabUrl` (framed connector asks the
background its top-level page) — the same boundary-identity concern in
opposite directions. Upstream PRs from these series should cite #1882
as related work without claiming it.

## RadioCult series

| Layer | Commit | Purpose |
| --- | --- | --- |
| Embed player connector (`radiocult`) | `60b5fc0dd8db743ce4f6cc32aa1fc3643d5938ed` | Four player variants and track/artist reading; zero station content |
| Transport copy | `feb96fa6eff15be443a60eec385401fa91ee469a` | Exact copy of the `ident` patch |
| Station enrichment | `cb882da270f7b36b9276e5da3f8601c4fde0b21b` | `station.ts` parsing/enrichment, listening-origin plumbing and station tests |
| Preference (`radiocult-ident`) | `1e775c81781bfc824ade09ad4929a51bdb6c34d2` | Configurable station trademark filtering, native UI/localization and option regression tests |

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

### RadioCult inversion verification

A Sol high rebuilt the series on 2026-10-29 (session source below) so the
connector ships without station content, with the station work stacked
above it. Per-layer types and tests passed (5, then 8, then 24 tests;
final full suite **2,197**, all five linters, Chrome build). The final
tree is identical to the pre-inversion tip `e4119fea` (empty diff), and
the stack's transport copy is byte-identical to `ident`. One typecheck
correction — the conventional `export {}` marker after import removal —
was made at the connector layer before committing. Receipts:
[file:///home/rektide/src/web-scrobbler-radiocult/.test-agent/radiocult-invert/README.md](file:///home/rektide/src/web-scrobbler-radiocult/.test-agent/radiocult-invert/README.md).

## AT Protocol series

Completed by a separate Sol high after the OAuth rewrite and assemblage
checkpoint. Its archived feature source is `81942226`, with extraction reads
bound to the identical production-code tip `d4e39777`; the original common
base `0eb87a1c` was later inverted into the stack's transport copy
`25a3a5b7fa6f2ba3d522687f5d91e4b25550d4ca`.

| Layer | Commit | Purpose |
| --- | --- | --- |
| Records mapping | `d11ef1afd7512f44a5d5cb429ef0b37809f0965e` | Stable Teal/Rocksky mapping, destination vocabulary and mapping tests, without station consumption |
| Complete feature | `049087211815b14510cb00b534cf103b366911d2` | Durable extension-owned OAuth, scrobbler, account UI, localized labels, callback boundaries and native unit coverage |
| Browser verification (`atproto`) | `e3cb58e67457292862f947b37892a40132910d21` | Source-built Chromium harness, native network routing, six browser cases and contributor guide |
| Transport copy | `25a3a5b7fa6f2ba3d522687f5d91e4b25550d4ca` | Exact copy of the `ident` patch |
| Station consumption (`atproto-ident`) | `03a4f350cba6226d58aeb3591353b6b1db5b7e31` | Optional station metadata in play records, mapping tests and the guide's station sentence |

The production AT Protocol modules, content callback relay and account component
are byte-for-byte equal to the reviewed OAuth result. Parent comparison verified
that boundary directly. RadioCult connector/options/localization and its
`getTabUrl` / `topLevelUrl` plumbing are absent. Generic station
consumption lives only in the `atproto-ident` stack; the standalone
series' tests use no station fixtures.

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

### AT Protocol inversion verification

A separate Sol high rebuilt the series on 2026-10-29 (session source
below) with station consumption stripped from all three feature commits
and restored as the stack's final commit. The agent enumerated 95
station-matching lines on the line: 48 upstream (untouched), 38 transport
(deferred to the copy), 9 mapping/test (stripped then restored), 0
feature/browser. Per-layer types and tests passed (4, 25, 25 unit plus
six Chromium, 28; final full suite **2,189 unit tests**, all five
linters, six Chromium tests). The final tree is identical to the
pre-inversion tip `079d85f7` (empty diff), and the `atproto` tree
contains zero station-identity references. Receipts:
[file:///home/rektide/src/web-scrobbler-atproto/.test-agent/atproto-invert/README.md](file:///home/rektide/src/web-scrobbler-atproto/.test-agent/atproto-invert/README.md).

## Rollout boundary

The [OAuth implementation account](/doc/upstreaming/oauth.md#browser-and-rollout-contract)
and [companion contract](file:///home/rektide/src/web-scrobbler-github/doc/oauth.md#coordinated-rollout)
remain prerequisites for an AT Protocol release. Production metadata/callback
hosting and real authorization are not established by a successful local build.
The bookmarks are pushed to the operator's fork as delivery references; no
upstream PR has been made.
