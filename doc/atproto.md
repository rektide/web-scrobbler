---
type: Guide
title: AT Protocol scrobbling
description: Record destinations, extension-owned public OAuth, static callback contract and contributor checks.
resource: /doc/atproto.md
status: draft
generated: { by: "model:openai/gpt-6.1-sol#high", at: 2026-10-28 }
sources:
  - resource: "opencode://ses_e7b6ccdccffe4hTfEU6PzkrWbf"
    title: Extract the AT Protocol feature into a focused series and verify native integration and browser tests
  - resource: /src/core/scrobbler/atproto/oauth-client.ts
    title: Extension-owned authorization, storage and lifecycle locks
  - resource: /src/core/scrobbler/atproto/field-mapping.ts
    title: Teal and Rocksky record mappings
  - resource: /tests/e2e/atproto-account.spec.ts
    title: Source-built account, refresh and legacy-session browser checks
---

# AT Protocol scrobbling

Accounts accepts an AT Protocol handle or DID. Both **teal.fm**
(`fm.teal.feed.play`) and **Rocksky** (`app.rocksky.scrobble`) are enabled by
default; their checkboxes independently select writes to the account's PDS.
Now-playing and loving tracks are not implemented for this service.

Teal records include the listening page, music-service origin and optional
generic station metadata supplied by a connector. Rocksky durations are
milliseconds; absent title, artist and album fields use `Unknown`.

## OAuth ownership and hosted callback

The extension runs public `@atcute/oauth-node-client` 2.0.1, including identity
resolution, PAR, PKCE, code exchange, DPoP requests and refresh. Despite its name,
this library does not require a Node server. State and sessions are awaited
per-entry writes in `browser.storage.local`, namespaced by client ID. Web Locks
serialize refresh and lifecycle operations. A separate active-account entry holds
only a DID, not copied tokens.

A matching HTTPS site must publish `/oauth-client-metadata.json` and serve
`/oauth/callback`. Metadata must use the same client ID, redirect URI, public
authentication (`token_endpoint_auth_method: none`), DPoP binding, and scopes:

```text
atproto repo:fm.teal.feed.play?action=create repo:app.rocksky.scrobble?action=create
```

The callback page forwards its original query with same-window `postMessage`:

```js
window.postMessage(
	{ type: 'web-scrobbler/oauth-callback', search: window.location.search },
	window.location.origin,
);
```

It must never exchange codes or forward credentials. The extension accepts only
the exact configured top-frame callback URL, validates the message and consumes
the library's single-use state. It replies with
`{ type: 'web-scrobbler/oauth-callback-result', ok: boolean }` to that origin.
The site should retry delivery until acknowledgement while the content script
starts, then scrub the query and display the result. The extension accepts one
valid delivery per callback page. A failure requires a new sign-in.

`VITE_ATPROTO_OAUTH_ORIGIN` changes both URLs and preserves a project subpath:

```sh
VITE_ATPROTO_OAUTH_ORIGIN=https://example.com/project npm run dist chrome
```

The default is `https://webscrobbler.com`. **The matching production metadata and
callback have not been deployed as part of this change.** Deploy the compatible
static site before distributing the feature. No new server, `identity` permission
or fixed extension ID is required. Users must grant the extension's existing
optional HTTPS host access before signing in, because accounts may use arbitrary
PDS/authorization servers. Handle resolution also uses Cloudflare DNS-over-HTTPS.

Legacy website-owned sessions require reauthorization; merely reading or signing
in does not delete them. Explicit signout removes current and legacy credentials
while retaining destination preferences. Remote revocation is best effort; the
library currently revokes the access token, so local deletion does not prove
revocation of the whole grant. Public-client grants can require reauthorization
after approximately two weeks.

## Contributor verification

Use the native npm toolchain (verified with Node 24.21.0 / npm 11.19.0):

```sh
npm ci --strict-peer-deps
npm run checkts
npm test -- --run
npm run lint
npx playwright install chromium
npx playwright test
npm run dist chrome
npm run dist firefox
```

Playwright builds the harness from current sources before serving it. Its output
and results stay in ignored `build/`. Native Playwright routing mocks external
OAuth/PDS requests; no MSW adapter or optional Vitest peer override is needed.
The harness uses real `Song` instances and an extension-API shim. It checks account
readiness, legacy data, signout, refresh persistence across page recreation and
both record formats. Unit tests additionally exercise storage failures, callback
guards/replay, expiry, issuer/denial, concurrent refresh and scrobbler results.

These checks do not establish live authorization, production metadata/routing,
in-flight MV3 suspension safety or Firefox/Safari runtime OAuth. Firefox builds
retain the native background-page manifest; Safari distribution requires macOS.
