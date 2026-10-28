---
type: Delivery
title: Focused AT Protocol and RadioCult histories
description: Preserved combined-workspace checkpoint, independent feature workspaces, shared station prerequisite and reviewed commit-series evidence.
resource: /doc/upstreaming/splits.md
status: draft
generated: { by: "model:openai/gpt-6-astra#xhigh", at: 2026-10-28 }
sources:
  - resource: "opencode://ses_e7ba2bd5affezqZcLye2GkxcFE"
    title: Human commissions OAuth-first rework and independent Sol-built split histories; parent reviews boundaries, preserves the complete assemblage and assigns bookmarks
  - resource: "opencode://ses_e7b8b15c0fferGf3Etqbeu8lip"
    title: Sol xhigh implements and verifies extension-owned OAuth and the paired website relay
  - resource: "opencode://ses_e7b88eb78ffeCR6oYbG63P1bAD"
    title: Sol high reconstructs and verifies the generic station prerequisite and clean RadioCult layers
  - resource: "opencode://ses_e7b6ccdccffe4hTfEU6PzkrWbf"
    title: Separate Sol high commissioned to reconstruct the AT Protocol series from the preserved OAuth result
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
---

# Focused AT Protocol and RadioCult histories

## Current destinations

| Purpose | Workspace | Bookmark / revision |
| --- | --- | --- |
| Preserved combined implementation and local artifacts | `/home/rektide/src/web-scrobbler-teal` | `teal-assemblage-20261028` → `81942226` |
| RadioCult submission series | `/home/rektide/src/web-scrobbler-radiocult` | `radiocult` → `3cacceab` |
| AT Protocol submission series | `/home/rektide/src/web-scrobbler-atproto` | Reconstruction commissioned; existing `atproto` name will move after review |

The feature workspaces share the same JJ repository. Their working directories
and npm installations are separate. The parent retains the historical assemblage
and this account; workspace-specific assessments and generated artifacts are
excluded from the focused submission histories.

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

Commissioned to a separate Sol high after the OAuth rewrite and assemblage
checkpoint. Its immutable feature source is `81942226`; the exact common base
is `0eb87a1c`. It is to reconstruct semantic, checked layers with the current
extension-owned OAuth lifecycle and source-built browser verification, while
excluding RadioCult-specific code and development-history packaging artifacts.

The reconstruction also owns a clean resolution of the assemblage's optional
Vitest/MSW dependency mismatch. Its completed commits, verification and bookmark
assignment will be recorded here after return and review.

## Rollout boundary

The [OAuth implementation account](/doc/upstreaming/oauth.md#browser-and-rollout-contract)
and [companion contract](file:///home/rektide/src/web-scrobbler-github/doc/oauth.md#coordinated-rollout)
remain prerequisites for an AT Protocol release. Production metadata/callback
hosting and real authorization are not established by a successful local build.
Bookmarks are local delivery references; no feature push or PR has been made.
