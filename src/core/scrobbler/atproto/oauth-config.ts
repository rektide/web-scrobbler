/**
 * Build-time-configurable AT Protocol OAuth host.
 *
 * The extension cannot host OAuth client metadata itself (MV3 has no stable
 * https:// origin), so a separate hosted site mediates the OAuth dance and
 * relays the session back via `postMessage`. This module is the single source
 * of truth for every URL that points at that host.
 *
 * Override at build time by setting `VITE_ATPROTO_OAUTH_ORIGIN` in the
 * environment before building, e.g. for dev:
 *
 *   VITE_ATPROTO_OAUTH_ORIGIN=https://rektide.github.io npm run build chrome dev
 *
 * The value may include a subpath (for project-pages deployments such as
 * `https://rektide.github.io/web-scrobbler-github`). It defaults to the
 * production host, `https://webscrobbler.com`.
 *
 * The actual replacement is wired in `vite.configs.ts` and
 * `vite.harness.config.ts` via Vite's `define`.
 */

const DEFAULT_ORIGIN = 'https://webscrobbler.com';

const rawOrigin = (
	import.meta.env.VITE_ATPROTO_OAUTH_ORIGIN ?? ''
).trim();

const parsed = new URL(rawOrigin || DEFAULT_ORIGIN);
const path = parsed.pathname.replace(/\/+$/, '');

/**
 * Base URL of the hosted OAuth site, no trailing slash. May include a subpath.
 */
export const oauthOrigin: string = parsed.origin + path;

/**
 * `postMessage` origin (scheme://host[:port], never a path) to accept relayed
 * OAuth sessions from. Always the bare origin even when `oauthOrigin` has a
 * subpath, since `event.origin` never includes a path.
 */
export const oauthMessageOrigin: string = parsed.origin;

/** URL of the OAuth client metadata document (used as the `client_id`). */
export const oauthClientId: string = `${oauthOrigin}/oauth-client-metadata.json`;

/** OAuth redirect URI (the callback page on the hosted site). */
export const oauthRedirectUri: string = `${oauthOrigin}/oauth/callback`;

/** Connect page URL the extension opens to start the OAuth flow. */
export const oauthConnectUrl: string = `${oauthOrigin}/oauth/connect`;

/** Path prefix used to recognize OAuth pages in content + background guards. */
export const oauthPathPrefix: string = `${oauthOrigin}/oauth/`;
