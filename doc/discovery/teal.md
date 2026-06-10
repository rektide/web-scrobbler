# web-scrobbler-teal

A fork of [web-scrobbler](https://github.com/web-scrobbler/web-scrobbler) that scrobbles to
[teal.fm](https://teal.fm) and other AT Protocol music services. Instead of writing plays to
Last.fm or ListenBrainz, this extension writes `fm.teal.alpha.feed.play` records directly to the
user's Bluesky PDS via AT Protocol OAuth.

## what this extension does

1. Detects music playback on ~100 supported streaming sites (inherited from upstream web-scrobbler)
2. Authenticates the user via AT Protocol OAuth (Bluesky login)
3. Writes play records to the user's PDS using the `fm.teal.alpha.feed.play` lexicon
4. Optionally writes to Rocksky too, if it uses a different lexicon (TBD)

## the teal.fm play record

The core lexicon is [`fm.teal.alpha.feed.play`](https://github.com/teal-fm/teal/blob/main/lexicons/fm.teal.alpha/feed/play.json). A play record has:

| field | required | description |
|-------|----------|-------------|
| `trackName` | yes | track title |
| `recordingMbId` | no | MusicBrainz recording ID (`mbid:<uuid>`) |
| `duration` | no | track length in seconds |
| `artists` | no | array of `{artistName, artistMbId}` |
| `releaseName` | no | album/release title |
| `releaseMbId` | no | MusicBrainz release ID |
| `isrc` | no | ISRC code |
| `originUrl` | no | URL of the track on the music service |
| `musicServiceBaseDomain` | no | e.g. `spotify.com`, `music.apple.com` |
| `submissionClientAgent` | no | user-agent style string identifying the client |
| `playedTime` | no | ISO datetime of when the track was played |
| `trackDiscriminant` | no | distinguishes variants (e.g. "Acoustic Version") |
| `releaseDiscriminant` | no | distinguishes release variants (e.g. "Deluxe Edition") |

The record key is a TID (timestamp ID). Records are written via
`com.atproto.repo.createRecord` or `com.atproto.repo.putRecord`.

## authentication strategy

AT Protocol OAuth is designed for web apps. The extension can't host a client metadata document
because Bluesky's auth server needs to fetch it from a public URL, so we use a public static site
as the OAuth entry point and relay the session back to the extension.

### key insight: atcute sessions are plain JSON

atcute stores everything in **localStorage as JSON** -- not IndexedDB, not CryptoKey objects.
The DPoP keys are JWK (JSON Web Key) objects: just JSON with base64-encoded `x`, `y`, `d`
fields. Tokens are strings. The entire session (`RawSession`) is:

```typescript
interface RawSession {
  dpopKey: { alg: 'ES256', kty: 'EC', crv: 'P-256', x: '...', y: '...', d: '...' }; // JWK
  info: { sub: 'did:plc:...', aud: 'https://...', server: { ... } };                  // JSON
  token: { access: '...', refresh: '...', type: 'Bearer', expires_at: 12345 };        // JSON
}
```

This means the session can be sent through any JSON-based channel: `externally_connectable`,
`window.postMessage`, even a cookie. No structured-clone tricks, no CryptoKey serialization
headaches.

Source: [`store/db.ts`](https://github.com/mary-ext/atcute/blob/trunk/packages/oauth/browser-client/lib/store/db.ts)
in the atcute repo. The README explicitly states "no IndexedDB" as a design choice for Safari
compatibility.

### the problem with extensions

AT Protocol OAuth requires a `client_id` URL pointing to a client metadata JSON document.
The authorization server (Bluesky) fetches this document during the flow. The metadata declares
`redirect_uris` -- where the user's browser gets sent after they authorize.

Extensions live at `chrome-extension://<id>/...` -- these are not publicly reachable URLs.
Bluesky's server validates the client metadata document by fetching it, so we can't host it
inside the extension. The redirect itself is just a browser navigation (Bluesky's server tells
the browser "go here"), so `chrome-extension://` redirect URIs might work for the redirect --
but we're not confident Bluesky accepts non-https redirect URI schemes. Uncharted territory.

### option A: hosted-site-mediated OAuth

Host the client metadata and the OAuth flow on a public static site. For production, that can be
`webscrobbler.com`. For development, use the owned `rektide.github.io` fork first. The static site
handles the OAuth dance, then sends the JSON session to the extension.

Client metadata at `webscrobbler.com/client-metadata.json`:
```json
{
  "client_id": "https://webscrobbler.com/client-metadata.json",
  "client_name": "Web Scrobbler",
  "client_uri": "https://webscrobbler.com",
  "redirect_uris": ["https://webscrobbler.com/oauth/callback"],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

Static pages on `webscrobbler.com`:
- `/oauth/connect` -- initiates the OAuth flow via atcute's `createAuthorizationUrl()`
- `/oauth/callback` -- receives the redirect, calls `finalizeAuthorization()`, has the session

After the callback page has the session, it needs to pass it to the extension. There are several
communication channels available, with different tradeoffs.

#### communication option 1: `externally_connectable` (Chrome-only, cleanest)

Chrome extensions can declare `externally_connectable` in their manifest:

```json
{
  "externally_connectable": {
    "matches": ["https://webscrobbler.com/*"]
  }
}
```

This tells Chrome to inject `chrome.runtime` into the matching web pages. The callback page on
`webscrobbler.com` can then call:

```js
chrome.runtime.sendMessage(extensionId, { type: 'oauth-session', session });
```

The extension's background script receives it via `chrome.runtime.onMessageExternal.addListener(...)`.

Pros:
- Purpose-built for this exact use case (web page → extension messaging)
- No content scripts needed, no DOM tricks, no polling
- The web page fires and forgets -- one line of code
- JSON serialization is fine since the session is all plain JSON/JWK

Cons:
- Chrome-only. Firefox doesn't support `externally_connectable`
- The web page needs to know the extension ID (hardcode from Chrome Web Store listing)
- Dev builds with random extension IDs won't match -- need a separate mechanism for development

#### communication option 2: content script reads localStorage directly (cross-browser, possible)

Content scripts share the page's origin storage APIs in the OAuth callback tab. atcute stores
sessions in localStorage under `${storageName}:sessions`; the default is `atcute-oauth:sessions`.
The content script doesn't need cooperation from the page's JavaScript if we keep that storage name
stable:

```js
// content script matching https://webscrobbler.com/oauth/*
const raw = localStorage.getItem('atcute-oauth:sessions');
if (raw) {
  const store = JSON.parse(raw);
  const firstKey = Object.keys(store)[0];
  const session = store[firstKey].value; // the RawSession JSON
  browser.runtime.sendMessage({ type: 'oauth-session', session });
}
```

Pros:
- Cross-browser (works in Chrome, Firefox, Safari)
- No cooperation needed from the hosted site's JavaScript
- No `externally_connectable`, no `postMessage`, no iframes
- The content script is already loaded -- just read localStorage and relay

Cons:
- Content script needs to know the atcute storage name and localStorage schema (fragile coupling)
- The content script needs to detect when the OAuth flow is complete (watch for URL changes
  or poll localStorage)
- Requires `content_scripts` entry in manifest for `webscrobbler.com/oauth/*`

#### communication option 3: `window.postMessage` (cross-browser, explicit handshake)

The callback page explicitly sends the session to the content script:

```js
// on webscrobbler.com/oauth/callback (page JS)
window.postMessage({ type: 'oauth-session', session }, location.origin);

// content script on webscrobbler.com/oauth/*
window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.data?.type === 'oauth-session') {
    browser.runtime.sendMessage(event.data);
  }
});
```

Pros:
- Cross-browser
- Explicit -- the page decides what to send and when
- No coupling to atcute's internal storage format
- Works with content scripts in all browsers
- Works with development builds because the page doesn't need to know the extension ID

Cons:
- Requires the webscrobbler.com callback page to include the `postMessage` call (a few lines of JS)
- Any script on the page can listen if `'*'` is used as the target origin. Use the site's exact
  origin instead.
- The content script must validate `event.origin` before relaying the session.

#### communication option 4: extension page iframes webscrobbler.com (possible but problematic)

An extension page (popup, options, or dedicated `oauth.html`) contains
`<iframe src="https://webscrobbler.com/oauth/connect">`. The iframe does the full OAuth flow.
The callback page inside the iframe sends data to the parent extension page via
`window.parent.postMessage(session, '*')`.

The parent (extension page) receives it because it's the same window hierarchy.

Pros:
- User never leaves the extension context (stays in popup/options)
- The iframe handles all redirects transparently

Cons:
- **Bluesky's auth page almost certainly has `X-Frame-Options: DENY`** to prevent clickjacking.
  The iframe will break when it tries to load `bsky.social/auth`. This is a showstopper.
- Even if it worked, the UX of an auth flow inside an iframe is janky (small popup window,
  confusing focus behavior)
- Not viable for production use

#### communication option 5: webscrobbler.com iframes an extension page (blocked)

The webscrobbler.com page embeds `<iframe src="chrome-extension://...">`. The extension page
receives the session and processes it.

This is blocked by Chrome's security model. Web pages cannot iframe `chrome-extension://` URLs.

#### communication option 6: cookie-based (Margin's approach)

The callback page sets a cookie on `webscrobbler.com`, the extension reads it with
`browser.cookies.get()` (requires `cookies` permission in manifest).

Pros:
- Proven pattern (Margin uses this)
- Works across browser restarts

Cons:
- Requires `cookies` permission (users see this in the install prompt)
- Session data in a cookie has size limits (~4KB) and security implications
- The session JSON would need to be URL-safe or split across multiple cookies
- More moving parts than the other options
- Margin uses this because their backend sets the cookie. For us, client-side JS sets it,
  which is a different threat model

#### production option: `externally_connectable` for Chrome, `postMessage` or localStorage fallback

Chrome is the primary target. `externally_connectable` is the cleanest production mechanism -- one
line of code on the web page, one listener in the background script. For Firefox and development
builds where the extension ID isn't known, use `window.postMessage` through a content script. A
localStorage reader can stay as a fallback if the callback page can't run our relay code.

All paths should end in the same place: the background script receives the JSON session and stores
it in `browser.storage.local` under the `TealFm` namespace.

### flow (putting it all together)

1. User clicks "Connect Bluesky" in extension options
2. Extension opens `webscrobbler.com/oauth/connect` or `https://rektide.github.io/oauth/connect`
   in a new tab
3. That page runs atcute's `createAuthorizationUrl()`, redirects to Bluesky
4. User authorizes
5. Bluesky redirects to the matching hosted callback URL
6. Callback page parses `location.hash`, calls `finalizeAuthorization()`, and gets the session
7. Callback page sends session to extension via `postMessage` for development/fallback, or
   `externally_connectable` for Chrome production
8. Background stores session in `browser.storage`
9. Background creates an `OAuthUserAgent` from the stored JWK + tokens
10. All record writes go through `OAuthUserAgent.handle()` + atcute `Client`

### recommended first implementation flow

Start by proving OAuth handoff before implementing scrobbling. The risky part is moving an AT
Protocol OAuth session from a public web page into a Manifest V3 extension without depending on a
stable extension ID.

Use the `rektide.github.io` fork first:

1. Host `public/oauth-client-metadata.json` from `~/src/web-scrobbler-github` with
   `client_id: "https://rektide.github.io/oauth-client-metadata.json"` and
   `redirect_uris: ["https://rektide.github.io/oauth/callback"]`.
2. Add `src/routes/oauth/connect.tsx` to collect a Bluesky handle, configure atcute, call
   `createAuthorizationUrl()`, then navigate to the returned URL.
3. Add `src/routes/oauth/callback.tsx` to configure atcute with the same metadata, parse
   `new URLSearchParams(location.hash.slice(1))`, call `finalizeAuthorization()`, scrub the hash,
   and call `window.postMessage({ type: 'web-scrobbler-teal/oauth-session', session }, location.origin)`.
4. In the extension content script, special-case `https://rektide.github.io/oauth/*` before normal
   connector loading. Listen for the postMessage event, validate `event.origin`, and relay the
   session with `browser.runtime.sendMessage` / `sendContentMessage`.
5. In the background script, validate `sender.url`, then store `{ sessionID, sessionName,
   oauthSession }` in `browser.storage.local` under a new `TealFm` storage namespace.
6. Add a minimal `TealFm` account row that opens `https://rektide.github.io/oauth/connect` and shows
   the stored DID/handle after the callback succeeds.
7. After the handoff works, implement the `TealScrobbler` write path with one record write to
   `fm.teal.alpha.feed.play` from a test song.

This flow should use `postMessage` first. Add `externally_connectable` only after the hosted flow
works and the production extension ID is known.

One unresolved implementation detail: atcute's `OAuthUserAgent.getSession()` refresh path reads from
its configured localStorage database. A Manifest V3 background service worker doesn't have normal
page localStorage. For the first scrobble spike, instantiate `OAuthUserAgent` directly from the
stored raw session. Before shipping, either persist refreshed sessions back into extension storage or
wrap atcute's refresh path so it doesn't depend on page localStorage in the service worker.

### option B: direct OAuth in the extension (investigate later)

If Bluesky's auth server accepts `chrome-extension://` redirect URIs, we can skip the hosted-site
relay entirely. The extension would run atcute directly, with the callback
page inside the extension. This is simpler but untested.

Client metadata would need to list the Chrome Web Store extension ID and AMO extension ID
as redirect URIs. Dev builds with random IDs wouldn't work without a separate metadata document.

### option C: backend proxy (Margin's approach, not recommended for us)

Margin routes all auth through their Go backend. The extension never holds DPoP keys or talks
to the PDS directly. This works but requires running a service. For us, where the extension
writes records directly to the user's PDS, it's unnecessary overhead.

### hosting the client metadata

PR into [`web-scrobbler/web-scrobbler.github.io`](https://github.com/web-scrobbler/web-scrobbler.github.io)
(serves `webscrobbler.com`). Upstream would likely accept this -- adding Bluesky as a scrobble
target fits their multi-service model, and it's one static JSON file + two static HTML pages.
Fallback: our own GitHub Pages.

### what margin.at does (reference)

Margin uses option C exclusively. Their flow:

1. Extension popup shows "Sign In" button
2. `browser.tabs.create({ url: 'https://margin.at/login' })`
3. Go backend handles ATProto OAuth server-side
4. Backend sets `margin_session` cookie on `margin.at` domain
5. Extension reads cookie via `browser.cookies.get()` (requires `cookies` permission)
6. Extension sends cookie as `X-Session-Token` header, backend proxies to PDS

For Safari (restricted cookie access), a content script on `margin.at/*` proxies fetch calls
using the page's cookie context. The extension never holds DPoP keys or ATProto tokens.

## technology choices

### AT Protocol client: atcute

[atcute](https://github.com/mary-ext/atcute) (`@atcute/oauth-browser-client` +
`@atcute/client`) is preferred over `@atproto/oauth-client-browser` for several reasons:

- lightweight, tree-shakeable packages
- plain JSON/JWK session objects that can cross extension messaging boundaries
- DPoP key management handled internally
- used in production by multiple AT Protocol apps

Key packages:

- `@atcute/oauth-browser-client` -- OAuth flow, session management
- `@atcute/client` -- XRPC client for making authenticated calls
- `@atcute/identity-resolver` -- DID/handle resolution
- `@atcute/oauth-crypto` -- DPoP key generation, JWK handling

atcute's browser OAuth package stores its own database in page localStorage, not IndexedDB. That is
good for the hosted callback page, but it means the extension background script should not assume
atcute can refresh sessions from its default storage in a Manifest V3 service worker.

### fallback: @atproto/oauth-client-browser

The official Bluesky package works too. Heavier dependency, but has Bluesky team support. We
should evaluate both and pick whichever causes fewer issues in the extension context. The APIs
are conceptually similar.

### extension framework: current (vite + webextension-polyfill)

The upstream extension uses vite with custom build scripts and `webextension-polyfill`. We keep
this rather than migrating to WXT (which [Margin](https://margin.at) uses) to minimize divergence
from upstream and make it easier to pull in upstream changes.

## integration with web-scrobbler architecture

The upstream extension uses a `BaseScrobbler` abstract class with a well-defined interface:

```
getAuthUrl()          -> URL for user to authorize
getSession()          -> retrieve stored session
sendNowPlaying(song)  -> notify current track
scrobble(songs)       -> write play records
sendPaused(song)      -> notify pause
sendResumedPlaying()  -> notify resume
toggleLove(song)      -> love/unlove
getSongInfo(song)     -> fetch song metadata
getLabel()            -> display name
```

We implement a `TealScrobbler` extending `BaseScrobbler<'TealFm'>` that:

- Uses atcute OAuth for `getAuthUrl()` / `getSession()`
- Maps `BaseSong` fields to `fm.teal.alpha.feed.play` record fields
- Writes records via `com.atproto.repo.createRecord` in `scrobble()`
- Treats `sendNowPlaying()`, `sendPaused()`, and `sendResumedPlaying()` as no-ops unless teal.fm
  gains a separate now-playing record type
- Registers itself in the `registeredScrobblers` array in `scrobble-service.ts`

### song field mapping

| BaseSong field | play record field |
|----------------|-------------------|
| `track` | `trackName` |
| `artist` | `artists[0].artistName` |
| `album` | `releaseName` |
| `duration` | `duration` (already seconds in `BaseSong.getDuration()`) |
| `originUrl` | `originUrl` |
| `connector.label` / `originUrl` | derive `musicServiceBaseDomain` |
| `metadata.startTimestamp` | `playedTime` |

### storage

The `TealFm` storage namespace holds:

- `sessionID` -- the user's DID
- `sessionName` -- the user's handle
- `oauthSession` -- the raw atcute session JSON, including DPoP JWK and tokens

## lexicon comparison: teal.fm vs rocksky

[Rocksky](https://rocksky.app) ([`tsirysndr/rocksky`](https://github.com/tsirysndr/rocksky)) uses
its own lexicon namespace (`app.rocksky.*`) with a different scrobble record
(`app.rocksky.scrobble`). Neither service reads the other's lexicon -- writing to one will not
appear in the other. To support both, we need either dual-write in a single scrobbler or two
separate scrobbler implementations.

Source: [LEXICONS.md](https://github.com/tsirysndr/rocksky/blob/main/LEXICONS.md) in the rocksky repo.

### scrobble/play record fields

Teal.fm record type: `fm.teal.alpha.feed.play`
Rocksky record type: `app.rocksky.scrobble`

| teal.fm (`fm.teal.alpha.feed.play`) | rocksky (`app.rocksky.scrobble`) | notes |
|---|---|---|
| `trackName: string` | `title: string` | different field names, same data |
| `recordingMbId: string` | | teal uses `mbid:<uuid>` format |
| | `mbid: string` | rocksky's equivalent to recordingMbId, possibly plain UUID format |
| `trackMbId: string` | | teal-only, MusicBrainz track ID |
| `duration: integer` | `duration: integer` | **units differ**: teal = seconds, rocksky = milliseconds |
| `artists: {artistName: string, artistMbId: string}[]` | `artists: {name: string, mbid: string}[]` | same shape, different inner field names |
| | `artist: string` | rocksky also has a flat artist string |
| | `albumArtist: string` | rocksky-only |
| `releaseName: string` | `album: string` | different field names, same data |
| `releaseMbId: string` | | teal-only, MusicBrainz release ID |
| `isrc: string` | `isrc: string` | same |
| `originUrl: string` | | teal-only, URL of the track on the music service |
| `musicServiceBaseDomain: string` | | teal-only, e.g. `spotify.com` |
| `submissionClientAgent: string` | | teal-only, user-agent style client identifier |
| `playedTime: datetime` | `createdAt: datetime` | similar purpose, different names |
| `trackDiscriminant: string` | | teal-only, e.g. "Acoustic Version" |
| `releaseDiscriminant: string` | | teal-only, e.g. "Deluxe Edition" |
| | `trackNumber: integer` | rocksky-only |
| | `discNumber: integer` | rocksky-only |
| | `year: integer` | rocksky-only |
| | `releaseDate: datetime` | rocksky-only |
| | `tags: string[]` | rocksky-only, e.g. `["jazz funk"]` |
| | `albumArtUrl: string` | rocksky-only, external image URL |
| | `albumArt: blob` | rocksky-only, inline blob upload |
| | `spotifyLink: string` | rocksky-only |
| | `youtubeLink: string` | rocksky-only |
| | `tidalLink: string` | rocksky-only |
| | `appleMusicLink: string` | rocksky-only |
| | `genre: string` | rocksky-only |
| | `composer: string` | rocksky-only |
| | `lyrics: string` | rocksky-only |
| | `copyrightMessage: string` | rocksky-only |
| | `wiki: string` | rocksky-only |
| | `label: string` | rocksky-only |

### other rocksky record types

Rocksky defines additional record types beyond scrobbles. Teal.fm does not have equivalents.

| record type | description |
|---|---|
| `app.rocksky.song` | canonical track record (same shape as scrobble minus `createdAt`) |
| `app.rocksky.artist` | artist with name, tags, picture |
| `app.rocksky.album` | album with title, artist, year, release date, art |
| `app.rocksky.actor.status` | now-playing status with expiry |
| `app.rocksky.playlist` / `app.rocksky.playlistItem` | user playlists |
| `app.rocksky.like` | like on a song (strongRef) |
| `app.rocksky.shout` | comment/reply on any record type |
| `app.rocksky.graph.follow` | follow another rocksky user |
| `app.rocksky.feed.generator` | custom feed generator declaration |
| `app.rocksky.radio` | user-declared radio station |

## open questions

- **Client metadata hosting:** Start with `rektide.github.io` because that fork is owned and can be
  changed quickly. Later, PR the same static JSON and OAuth pages into
  `web-scrobbler/web-scrobbler.github.io` if upstream wants Bluesky support.
- **Session refresh in MV3:** atcute can instantiate an `OAuthUserAgent` from raw session JSON, but
  its refresh path expects its localStorage database. We need a storage adapter or explicit refreshed
  session persistence before production.
- **Scrobble timing:** teal.fm uses "play half the track duration, up to 4 minutes" as the scrobble
  threshold. Upstream already defaults to 50% with a 240 second cap, so no timing change should be
  needed for the first implementation.
- **Now playing vs. scrobbled:** The upstream extension sends both "now playing" and "scrobbled"
  events. teal.fm records are single play records with a timestamp. We may want to write a play
  record only on scrobble, not on now-playing.
- **Multiple account support:** AT Protocol supports multiple PDS identities. Should the extension
  support scrobbling to multiple Bluesky accounts?
- **Offline support:** If the user is offline when a scrobble happens, we should queue the record
  and write it when connectivity returns. The upstream extension already has a scrobble cache we
  can leverage.

## production URL migration

When switching from `rektide.github.io` (dev) to `webscrobbler.com` (production), update these files:

### Extension (`web-scrobbler-teal`)

| file | what changes |
|------|-------------|
| `src/core/scrobbler/atproto/atproto-types.ts` | `ATPROTO_OAUTH_ORIGIN`, `ATPROTO_OAUTH_CONNECT_URL` |
| `src/core/content/atproto-oauth.ts` | origin validation in `event.origin` check |
| `src/core/content/main.ts` | URL prefix in content script interceptor |
| `src/core/background/main.ts` | `sender.url` validation in background listener |

### Hosted site (`web-scrobbler-github`)

| file | what changes |
|------|-------------|
| `public/oauth-client-metadata.json` | `client_id`, `client_uri`, `redirect_uris` |
| `src/routes/oauth/connect.tsx` | `configureOAuth` metadata fields |
| `src/routes/oauth/callback.tsx` | `configureOAuth` metadata fields |

### Process

1. Deploy updated client metadata + OAuth routes to `webscrobbler.com`
2. Update all URL constants in the extension
3. Build and publish new extension version
4. Users with existing sessions stored under the old origin continue working until tokens expire
5. Old `rektide.github.io` routes can remain as a fallback

## project structure (implemented)

```
src/core/scrobbler/atproto/
  atproto-scrobbler.ts    # BaseScrobbler<'AtProto'> implementation
  atproto-types.ts        # constants (OAuth URLs) + play record type
  atcute-client.ts        # AtProtoClient wrapping OAuthUserAgent + createRecord
src/core/content/
  atproto-oauth.ts        # postMessage listener for OAuth callback relay
  main.ts                 # special-case interceptor for rektide.github.io/oauth/*
src/core/background/main.ts # atprotoOAuthSession background listener
src/core/storage/
  browser-storage.ts      # AtProto: LOCAL
  wrapper.ts              # AtProtoModel, AtProtoOAuthSession types
src/core/object/scrobble-service.ts # AtProtoScrobbler registered
src/util/communication.ts  # atprotoOAuthSession message type
src/ui/options/components/accounts.tsx # AtProto scrobbler display row

~/src/web-scrobbler-github/
  public/oauth-client-metadata.json
  src/routes/oauth/connect.tsx   # handle input → atcute createAuthorizationUrl
  src/routes/oauth/callback.tsx  # finalizeAuthorization → postMessage + handle resolve
```

## bundle impact

atcute adds approximately **16.4 KB minified / 5.4 KB gzip** to the background script bundle.
This includes DPoP proof signing, session management, and nonce tracking. The `@atcute/client`
XRPC layer is not included (requests go through `OAuthUserAgent.handle()` directly).

## references

- [teal.fm](https://teal.fm) -- AT Protocol music scrobbler
- [teal-fm/teal lexicons](https://github.com/teal-fm/teal/tree/main/lexicons/fm.teal.alpha) -- play record schema
- [atcute](https://github.com/mary-ext/atcute) -- lightweight AT Protocol TypeScript libraries
- [AT Protocol OAuth spec](https://atproto.com/specs/oauth)
- [web-scrobbler](https://github.com/web-scrobbler/web-scrobbler) -- upstream extension
- [Margin](https://tangled.org/margin.at/margin) -- reference browser extension with AT Protocol integration (uses cookie-based backend auth, not directly applicable but useful for extension patterns)
