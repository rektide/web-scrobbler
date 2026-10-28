---
type: Integration
title: Extension-owned AT Protocol OAuth
description: Durable atcute public-client lifecycle, callback relay contract, local verification and remaining rollout constraints.
resource: /doc/upstreaming/oauth.md
status: draft
generated: { by: "model:openai/gpt-6.1-sol#xhigh", at: 2026-10-28 }
sources:
  - resource: "opencode://ses_e7b8b15c0fferGf3Etqbeu8lip"
    title: Implement and verify durable extension-owned OAuth and the coordinated local companion relay; preserve assemblage WIP
  - resource: /doc/upstreaming/README.md
    title: Prior upstream refresh, atcute recommendation and reproduced browser-session refresh failure
  - resource: /src/core/scrobbler/atproto/oauth-client.ts
    title: Public client, durable state/session ownership, locks and lifecycle
  - resource: /src/core/scrobbler/atproto/oauth-store.ts
    title: Awaited browser storage adapter with propagated persistence errors
  - resource: /tests/background/atproto-oauth.test.ts
    title: Real-library protocol, storage, refresh and concurrency tests with synthetic servers
  - resource: /tests/e2e/atproto-account.spec.ts
    title: Source-built browser checks for refresh, account readiness, signout and legacy sessions
  - resource: "file:///home/rektide/src/web-scrobbler-github/doc/oauth.md"
    title: Paired website relay and rollout contract
  - resource: "https://github.com/mary-ext/atcute/issues/86#issuecomment-5262426064"
    title: Maintainer recommends oauth-node-client for asynchronous WebExtension storage
  - resource: "https://github.com/mary-ext/atcute/blob/d5490616f3a5e1c90da119a6edd656561ad2f47c/packages/oauth/node-client/README.md#webextensions"
    title: Pinned library public-client, storage and WebExtension guidance
---

# Extension-owned AT Protocol OAuth

Implemented locally on the existing assemblage branch, without splitting,
squashing, moving bookmarks, pushing or deploying. The
[readiness assessment](/doc/upstreaming/README.md) retains the earlier failure
evidence and packaging work; this account describes the replacement.

## Implementation and revisions

| Repository | Commit | Change |
| --- | --- | --- |
| Extension | `966856aad3be3a0ec0206115942846a95627911b` | Durable OAuth, callback boundary, account UI and migrated browser tests |
| Extension | `4a8ff0a6311ba2b1e8e92519645422582974a3d9` | Safe auth/error results, content relay guards and expanded verification |
| Companion website | `96bd14c44312300581d2f10dc771c9597ee6f58e` | Callback-only relay, obsolete OAuth dependencies removed, rollout account |

The published package checked and installed is **`@atcute/oauth-node-client`
2.0.1**, not the official `@atproto/oauth-client-node`. Resolved supporting
versions are `@atcute/identity-resolver` 2.0.3, `@atcute/lexicons` 2.0.2 and
`@atcute/oauth-crypto` 1.0.1. Native npm manifests/lockfiles were updated; the
extension's stale pnpm lock and existing workspace approvals were untouched.

## Ownership and flow

1. Accounts collects a handle or DID inside the extension. Its internal message
   starts authorization in the background, not on the website.
2. A discoverable **public** `OAuthClient` resolves identity, persists PKCE/DPoP
   state, performs PAR, then opens the authorization URL in a normal tab.
3. Public HTTPS metadata and `/oauth/callback` remain hosted. The companion
   relays the original **query parameters**, never a session or token:
   `{ type: 'web-scrobbler/oauth-callback', search: '…' }`.
4. A top-frame content script verifies same-window source and message origin.
   The background checks its own extension ID, top-frame tab sender and exact
   parsed callback origin/path, then calls the library's public `callback()`.
5. The library consumes durable state, validates issuer, PKCE and identity,
   and saves the same session store that `restore()` and resource requests use.
   Only a DID pointer is saved separately for account selection/display.
6. The companion displays completion after a credential-free boolean
   acknowledgement. It scrubs the URL and retries delivery while the content
   script starts; the extension accepts one message per callback page.

The callback guard rejects duplicate/ambiguous parameters, missing issuer,
oversized payloads, wrong paths/frames/origins and the old raw-session message.
The library's state check remains authoritative. State consumption is serialized
with callback/start/signout lifecycle work, including concurrent deliveries.

## Storage, refresh and logout

[OAuthStore](/src/core/scrobbler/atproto/oauth-store.ts) directly awaits
`browser.storage.local` get/set/remove. It does not use `StorageWrapper.set`,
which swallows errors. Each state/session has its own key under
`AtProtoOAuth:v1:<encoded-client-id>:`; configuration changes do not accidentally
reuse another client's grant. `StoredState.expiresAt` is enforced by the adapter;
the library does not enforce it itself. Expired state is unavailable, not
automatically pruned. Starting another sign-in or signing out deliberately clears
this client's pending attempts.

Sessions are keyed by DID in the library's `StoredSession` shape. There is no
synchronous localStorage shim, raw-session transfer or second application token
copy. The library's refresh lock uses **Web Locks** per session. An additional
lifecycle lock keeps signout/callback and extension record writes from racing.
Refresh writes are awaited; persistence failures cannot become successful
volatile sessions. Irrecoverable refresh errors remove the library session.
The scrobbler returns native auth/error result arrays rather than leaking OAuth
exceptions or response bodies through its result interface.

Signout runs in the background against this same owned store, attempts remote
revocation and requires local deletion. Explicit signout also removes legacy
application credential fields, preserving lexicon preferences and unrelated
data. Remote revocation remains best effort; the current library revokes its
access token, so local deletion is not proof that the AS invalidated the entire
grant.

Old browser-client sessions are **not converted or silently deleted**. They no
longer count as signed in; Accounts explicitly requests reauthorization and keeps
preferences. New authorization leaves old data intact until explicit signout.
The UI observes storage changes and refetches on focus unconditionally, without
the former `isAuthStarted` gate. It displays the verified DID rather than trusting
a website-supplied handle.

## Browser and rollout contract

Chrome uses its existing MV3 worker; Firefox retains its existing background-page
manifest. Neither path relies on DOM storage, Node builtins or a new server.
The content-script relay avoids `identity` and `externally_connectable`
permissions and stable-extension-ID requirements. OAuth needs the extension's
existing optional HTTPS host access for arbitrary identities/PDSes and the
callback page. Accounts directs users to the existing permission button if it
is missing. DNS handle lookup uses Cloudflare's public DNS-over-HTTPS endpoint
alongside HTTPS well-known resolution, following the library's resolver design.

`VITE_ATPROTO_OAUTH_ORIGIN` still includes an optional project-page subpath.
For the local companion's current metadata:

```sh
VITE_ATPROTO_OAUTH_ORIGIN=https://rektide.github.io/web-scrobbler-pages npm run dist chrome
```

The default extension client still points at `https://webscrobbler.com`.
The earlier assessment found its metadata/callback missing; this work does not
deploy them. Follow the [companion rollout contract](file:///home/rektide/src/web-scrobbler-github/doc/oauth.md#coordinated-rollout):
publish matching metadata, base path and callback before distributing the paired
extension. Old website/browser-client flows are intentionally incompatible.
Public-client grants may require reauthorization after their approximately
two-week lifetime.

## Verification and remaining limits

Final verification used **Node 24.21.0 / npm 11.19.0**. Early exploratory runs
also used the environment's default Node 26; final types, unit/browser tests and
both extension builds were rerun with the explicit Node 24 installation.

| Check | Result |
| --- | --- |
| `npm run checkts` | Main and connector projects passed |
| `npm test -- --run` | 2,189 tests passed across 13 files |
| `npx playwright test` | Six source-built Chromium tests passed; all OAuth/PDS traffic mocked |
| `npm run dist chrome`, `npm run dist firefox` | Passed |
| Affected-file ESLint / Prettier | Passed |
| `npm ci --dry-run --ignore-scripts --strict-peer-deps --no-audit --no-fund` | Passed |
| Companion native npm static build | Passed |
| Companion affected-file ESLint / Prettier | Passed |

The 16 new unit checks cover durable write/consume failures, callback replay,
expiry/issuer/denial, project subpaths, rotated-token persistence, recreated
clients, concurrent refresh, invalid grants, scoped signout and content-message
guards. Browser tests exercise actual source-built account readiness, old-session
handling, refresh after page recreation and Teal/Rocksky writes. Their extension
APIs are a test shim, not an installed extension.

Additional local scratch checks under `.test-agent/oauth-rework/` passed:

- Packaged extension loaded in Chromium: native MV3 Web Locks, absence of the
  localStorage shim, native storage-driven UI changes, full browser restart,
  and signout from the recreated background, preserving preferences.
- Built companion static page: hydration, acknowledgement, denial, timeout,
  old-fragment rejection and URL scrubbing. The acknowledgement was simulated.

**Not established:** live authorization against a real PDS/AS; deployed routing,
metadata/CORS or permission prompts; in-flight Chrome worker suspension during
authorization/exchange/refresh; Firefox/Safari runtime authorization. CDP stop
requests did not establish a new worker target under Playwright, so only the
full-process restart check is claimed. Safari distribution requires macOS.

Full extension lint debt and Vitest's optional MSW peer mismatch remain as
recorded in the assessment; no broad formatting or test-stack redesign was done.
The companion's full lint stops on 29 unchanged generated Vosse asset errors;
standalone typechecking is blocked by dependency `debug` declarations and Vite's
Node `FSWatcher` typing. No deployment-readiness claim follows from local checks.

The pre-existing transcript, pnpm approvals/lock, test result and tracked harness
dist subtree remained byte-for-byte separate. Parent owns the assemblage
checkpoint/datestamp and subsequent focused workspace histories.
