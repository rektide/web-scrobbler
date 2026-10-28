import {
	CompositeDidDocumentResolver,
	CompositeHandleResolver,
	DohJsonHandleResolver,
	LocalActorResolver,
	PlcDidDocumentResolver,
	WebDidDocumentResolver,
	WellKnownHandleResolver,
} from '@atcute/identity-resolver';
import type { Did } from '@atcute/lexicons';
import { isActorIdentifier } from '@atcute/lexicons/syntax';
import {
	OAuthClient,
	type PublicOAuthClientOptions,
	type StoredSession,
	type StoredState,
} from '@atcute/oauth-node-client';
import browser from 'webextension-polyfill';
import { oauthClientId, oauthRedirectUri, oauthScope } from './oauth-config';
import { OAUTH_STORAGE_PREFIX, OAuthStore } from './oauth-store';

export const oauthStores = {
	sessions: new OAuthStore<Did, StoredSession>(
		`${OAUTH_STORAGE_PREFIX}session:`,
	),
	states: new OAuthStore<string, StoredState>(
		`${OAUTH_STORAGE_PREFIX}state:`,
		browser.storage.local,
		(state) => state.expiresAt <= Date.now(),
	),
};

// An account pointer is not a second copy of the credentials.
export const oauthAccounts = new OAuthStore<'active', { did: Did }>(
	`${OAUTH_STORAGE_PREFIX}account:`,
);

export async function requestOAuthLock<T>(
	name: string,
	fn: () => Promise<T>,
): Promise<T> {
	return await navigator.locks.request(`${OAUTH_STORAGE_PREFIX}${name}`, fn);
}

export function createOAuthClient(
	overrides: Partial<PublicOAuthClientOptions> = {},
): OAuthClient {
	return new OAuthClient({
		metadata: {
			client_id: oauthClientId,
			redirect_uris: [oauthRedirectUri],
			scope: oauthScope,
		},
		stores: oauthStores,
		requestLock: requestOAuthLock,
		actorResolver: new LocalActorResolver({
			handleResolver: new CompositeHandleResolver({
				methods: {
					dns: new DohJsonHandleResolver({
						dohUrl: 'https://cloudflare-dns.com/dns-query',
					}),
					http: new WellKnownHandleResolver(),
				},
			}),
			didDocumentResolver: new CompositeDidDocumentResolver({
				methods: {
					plc: new PlcDidDocumentResolver(),
					web: new WebDidDocumentResolver(),
				},
			}),
		}),
		...overrides,
	});
}

// Construction has no asynchronous initialization or localStorage side effects.
export const oauthClient = createOAuthClient();

export async function getOAuthAccount(): Promise<{ did: Did } | undefined> {
	const account = await oauthAccounts.get('active');
	if (account && (await oauthStores.sessions.get(account.did))) {
		return account;
	}
	return undefined;
}

/** Only the background invokes this lifecycle; options sends an internal message. */
export async function authorizeAtProto(identifier: string): Promise<void> {
	const target = identifier.trim().replace(/^@/, '');
	if (!isActorIdentifier(target)) {
		throw new Error('Invalid AT Protocol handle or DID');
	}
	await requestOAuthLock('lifecycle', async () => {
		// Explicit new sign-in cancels any previous unfinished attempt.
		await oauthStores.states.clear();
		const { url, stateId } = await oauthClient.authorize({
			target: { type: 'account', identifier: target },
		});
		try {
			await browser.tabs.create({ url: url.toString() });
		} catch (error) {
			await oauthStores.states.delete(stateId);
			throw error;
		}
	});
}

export async function completeAtProtoAuthorization(
	search: string,
): Promise<void> {
	await requestOAuthLock('lifecycle', async () => {
		// The library consumes state before exchange, checks issuer, PKCE and identity,
		// then awaits the very same session store used by restore/refresh.
		const { session } = await oauthClient.callback(
			new URLSearchParams(search),
		);
		await oauthAccounts.set('active', { did: session.did });
	});
}

export async function signOutAtProto(): Promise<void> {
	await requestOAuthLock('lifecycle', async () => {
		await oauthStores.states.clear();
		const account = await oauthAccounts.get('active');
		if (account) {
			try {
				await oauthClient.revoke(account.did);
			} catch {
				// Remote revocation is best effort, local deletion is not.
			} finally {
				await oauthStores.sessions.delete(account.did);
			}
		}
		await oauthAccounts.delete('active');
	});
}
