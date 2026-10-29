import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { OAuthStore } from '@/core/scrobbler/atproto/oauth-store';
import {
	TEST_DID,
	TEST_PDS,
	testDidDocument,
	testResourceMetadata,
	testAuthorizationMetadata,
} from '../mocks/atproto-oauth';

const fake = vi.hoisted(() => {
	const data: Record<string, unknown> = {};
	return {
		data,
		get: vi.fn(async (keys: string | null) =>
			structuredClone(keys === null ? data : { [keys]: data[keys] }),
		),
		set: vi.fn(async (values: Record<string, unknown>) => {
			Object.assign(data, structuredClone(values));
		}),
		remove: vi.fn(async (keys: string | string[]) => {
			for (const key of typeof keys === 'string' ? [keys] : keys) {
				delete data[key];
			}
		}),
		createTab: vi.fn(async () => ({ id: 1 })),
	};
});
vi.mock('webextension-polyfill', () => ({
	default: {
		storage: {
			local: { get: fake.get, set: fake.set, remove: fake.remove },
		},
		tabs: { create: fake.createTab },
		runtime: {
			id: 'test-extension',
			getURL: (path: string) => `moz-extension://test/${path}`,
		},
	},
}));

let auth: typeof import('@/core/scrobbler/atproto/oauth-client');
let pars: URLSearchParams[];
let tokens: URLSearchParams[];
let revoked: string[];
let invalidRefresh: boolean;

beforeEach(async () => {
	vi.resetModules();
	vi.resetAllMocks();
	for (const key of Object.keys(fake.data)) {
		delete fake.data[key];
	}
	pars = [];
	tokens = [];
	revoked = [];
	invalidRefresh = false;
	const locks = new Map<string, Promise<unknown>>();
	vi.stubGlobal('navigator', {
		locks: {
			request: async (name: string, fn: () => Promise<unknown>) => {
				const previous = locks.get(name) ?? Promise.resolve();
				const next = previous.catch(() => undefined).then(fn);
				locks.set(name, next);
				return next;
			},
		},
	});
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init);
			const url = request.url;
			if (url.startsWith('https://cloudflare-dns.com/dns-query')) {
				return Response.json({
					Status: 0,
					Answer: [{ type: 16, data: `"did=${TEST_DID}"` }],
				});
			}
			if (url === 'https://test.bsky.social/.well-known/atproto-did') {
				return new Response(TEST_DID);
			}
			if (
				decodeURIComponent(url) === `https://plc.directory/${TEST_DID}`
			) {
				return Response.json(testDidDocument);
			}
			if (url.endsWith('/.well-known/oauth-protected-resource')) {
				return Response.json(testResourceMetadata);
			}
			if (url.endsWith('/.well-known/oauth-authorization-server')) {
				return Response.json(testAuthorizationMetadata);
			}
			if (url.endsWith('/oauth/par')) {
				pars.push(new URLSearchParams(await request.text()));
				return Response.json({
					request_uri: 'urn:ietf:params:oauth:request_uri:test',
					expires_in: 600,
				});
			}
			if (url.endsWith('/oauth/token')) {
				expect(request.headers.get('DPoP')).toBeTruthy();
				const params = new URLSearchParams(await request.text());
				tokens.push(params);
				if (
					params.get('grant_type') === 'refresh_token' &&
					invalidRefresh
				) {
					return Response.json(
						{ error: 'invalid_grant' },
						{ status: 400 },
					);
				}
				return Response.json({
					sub: TEST_DID,
					access_token: `access-${tokens.length}`,
					refresh_token: `refresh-${tokens.length}`,
					token_type: 'DPoP',
					scope: 'atproto',
					expires_in: 3600,
				});
			}
			if (url.endsWith('/oauth/revoke')) {
				revoked.push(
					new URLSearchParams(await request.text()).get('token') ??
						'',
				);
				return new Response(null, { status: 200 });
			}
			if (url.endsWith('/xrpc/test')) {
				return Response.json({
					authorization: request.headers.get('Authorization'),
				});
			}
			throw new Error(`Unexpected test URL: ${url}`);
		}),
	);
	auth = await import('@/core/scrobbler/atproto/oauth-client');
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('retains project-page subpaths in metadata, callback matching and credential namespaces', async () => {
	vi.stubEnv('VITE_ATPROTO_OAUTH_ORIGIN', 'https://example.com/project///');
	vi.resetModules();
	const config = await import('@/core/scrobbler/atproto/oauth-config');
	const store = await import('@/core/scrobbler/atproto/oauth-store');
	expect(config.oauthClientId).toBe(
		'https://example.com/project/oauth-client-metadata.json',
	);
	expect(config.oauthMessageOrigin).toBe('https://example.com');
	expect(
		config.isOAuthCallbackUrl(
			'https://example.com/project/oauth/callback?code=x',
		),
	).toBe(true);
	expect(
		config.isOAuthCallbackUrl('https://example.com/oauth/callback'),
	).toBe(false);
	expect(store.OAUTH_STORAGE_PREFIX).toContain(
		encodeURIComponent(config.oauthClientId),
	);
});

async function begin(): Promise<string> {
	await auth.authorizeAtProto(TEST_DID);
	return `?${new URLSearchParams({ state: pars[pars.length - 1].get('state')!, iss: TEST_PDS, code: 'test-code' })}`;
}

describe('durable extension OAuth', () => {
	it('awaits state persistence before PAR and propagates storage failures', async () => {
		fake.set.mockRejectedValueOnce(new Error('disk full'));
		await expect(auth.authorizeAtProto(TEST_DID)).rejects.toThrow(
			'disk full',
		);
		expect(pars).toHaveLength(0);
		expect(fake.createTab).not.toHaveBeenCalled();
	});

	it('stores authorization state before opening a tab and completes after client recreation', async () => {
		const search = await begin();
		expect(fake.createTab).toHaveBeenCalledOnce();
		expect(pars[0].get('response_mode')).toBe('query');
		expect(pars[0].get('code_challenge_method')).toBe('S256');
		const recreated = auth.createOAuthClient();
		const { session } = await recreated.callback(
			new URLSearchParams(search),
		);
		expect(session.did).toBe(TEST_DID);
		const saved = await auth.oauthStores.sessions.get(TEST_DID);
		expect(saved?.tokenSet.access_token).toBe('access-1');
		expect(tokens[0].get('client_assertion')).toBeNull();
		expect(tokens[0].get('code_verifier')).toBeTruthy();
		await expect(
			recreated.callback(new URLSearchParams(search)),
		).rejects.toThrow('unknown state');
	});

	it('accepts a callback only once even when delivered concurrently', async () => {
		const search = await begin();
		const results = await Promise.allSettled([
			auth.completeAtProtoAuthorization(search),
			auth.completeAtProtoAuthorization(search),
		]);
		expect(
			results.filter((result) => result.status === 'fulfilled'),
		).toHaveLength(1);
		expect(tokens).toHaveLength(1);
		expect(await auth.getOAuthAccount()).toEqual({ did: TEST_DID });
	});

	it('does not exchange a code when durable state consumption fails', async () => {
		const search = await begin();
		fake.remove.mockRejectedValueOnce(new Error('delete failed'));
		await expect(auth.completeAtProtoAuthorization(search)).rejects.toThrow(
			'delete failed',
		);
		expect(tokens).toHaveLength(0);
		expect(await auth.getOAuthAccount()).toBeUndefined();
	});

	it('rejects unknown, expired, wrong-issuer and denied callbacks without token exchange', async () => {
		await expect(
			auth.completeAtProtoAuthorization(
				'?state=unknown&iss=https://evil.example&code=x',
			),
		).rejects.toThrow('unknown state');
		const expired = await begin();
		const stateId = new URLSearchParams(expired).get('state')!;
		const state = (await auth.oauthStores.states.get(stateId))!;
		await auth.oauthStores.states.set(stateId, {
			...state,
			expiresAt: Date.now() - 1,
		});
		await expect(
			auth.completeAtProtoAuthorization(expired),
		).rejects.toThrow('unknown state');
		const wrong = await begin();
		await expect(
			auth.completeAtProtoAuthorization(
				wrong.replace(
					encodeURIComponent(TEST_PDS),
					'https%3A%2F%2Fevil.example',
				),
			),
		).rejects.toThrow('issuer mismatch');
		await expect(auth.completeAtProtoAuthorization(wrong)).rejects.toThrow(
			'unknown state',
		);
		const missingIssuer = new URLSearchParams(await begin());
		missingIssuer.delete('iss');
		await expect(
			auth.completeAtProtoAuthorization(missingIssuer.toString()),
		).rejects.toThrow('missing iss parameter');
		const denied = (await begin()).replace(
			'code=test-code',
			'error=access_denied',
		);
		await expect(auth.completeAtProtoAuthorization(denied)).rejects.toThrow(
			'access_denied',
		);
		expect(tokens).toHaveLength(0);
	});

	it('does not report a completed account when saving credentials fails', async () => {
		const search = await begin();
		fake.set.mockRejectedValueOnce(new Error('disk full'));
		await expect(auth.completeAtProtoAuthorization(search)).rejects.toThrow(
			'disk full',
		);
		expect(await auth.getOAuthAccount()).toBeUndefined();
		expect(revoked).toContain('access-1');
	});

	it('persists rotated tokens across concurrent restores and another client recreation', async () => {
		await auth.completeAtProtoAuthorization(await begin());
		const stored = (await auth.oauthStores.sessions.get(TEST_DID))!;
		await auth.oauthStores.sessions.set(TEST_DID, {
			...stored,
			tokenSet: { ...stored.tokenSet, expires_at: 0 },
		});
		const first = auth.createOAuthClient();
		const second = auth.createOAuthClient();
		const sessions = await Promise.all([
			first.restore(TEST_DID),
			second.restore(TEST_DID),
		]);
		expect(tokens).toHaveLength(2);
		expect(tokens[1].get('refresh_token')).toBe('refresh-1');
		const saved = (await auth.oauthStores.sessions.get(TEST_DID))!;
		expect(saved.tokenSet.refresh_token).toBe('refresh-2');
		const response = await sessions[1].handle('/xrpc/test');
		expect(await response.json()).toEqual({
			authorization: 'DPoP access-2',
		});
		await auth.createOAuthClient().restore(TEST_DID);
		expect(tokens).toHaveLength(2);
	});

	it('propagates failed refresh persistence rather than returning volatile credentials', async () => {
		await auth.completeAtProtoAuthorization(await begin());
		const stored = (await auth.oauthStores.sessions.get(TEST_DID))!;
		await auth.oauthStores.sessions.set(TEST_DID, {
			...stored,
			tokenSet: { ...stored.tokenSet, expires_at: 0 },
		});
		fake.set.mockRejectedValueOnce(new Error('write failed'));
		await expect(
			auth.createOAuthClient().restore(TEST_DID),
		).rejects.toThrow('write failed');
		expect(revoked).toContain('refresh-2');
	});

	it('invalid_grant removes the unusable session and readiness becomes signed out', async () => {
		await auth.completeAtProtoAuthorization(await begin());
		const stored = (await auth.oauthStores.sessions.get(TEST_DID))!;
		await auth.oauthStores.sessions.set(TEST_DID, {
			...stored,
			tokenSet: { ...stored.tokenSet, expires_at: 0 },
		});
		invalidRefresh = true;
		await expect(
			auth.createOAuthClient().restore(TEST_DID),
		).rejects.toThrow();
		expect(await auth.getOAuthAccount()).toBeUndefined();
	});

	it('signout deletes owned state/session without touching old or unrelated user data', async () => {
		fake.data.AtProto = {
			oauthSession: { old: true },
			lexicons: { teal: false },
		};
		fake.data.Options = { preserved: true };
		await auth.completeAtProtoAuthorization(await begin());
		const unfinished = await begin();
		await auth.signOutAtProto();
		expect(await auth.getOAuthAccount()).toBeUndefined();
		expect(await auth.oauthStores.sessions.get(TEST_DID)).toBeUndefined();
		await expect(
			auth.completeAtProtoAuthorization(unfinished),
		).rejects.toThrow('unknown state');
		expect(fake.data.Options).toEqual({ preserved: true });
		expect(fake.data.AtProto).toEqual({
			oauthSession: { old: true },
			lexicons: { teal: false },
		});
	});

	it('awaits writes and limits explicit clearing to its own namespace', async () => {
		const store = new OAuthStore<string, { value: number }>('test:', {
			get: fake.get,
			set: fake.set,
			remove: fake.remove,
		});
		let persist: (() => void) | undefined;
		fake.set.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					persist = resolve;
				}),
		);
		let done = false;
		const saving = store.set('one', { value: 1 }).then(() => {
			done = true;
		});
		await Promise.resolve();
		expect(done).toBe(false);
		persist!();
		await saving;
		fake.data['test:one'] = { value: 1 };
		fake.data['other:one'] = { value: 2 };
		await store.clear();
		expect(fake.data['test:one']).toBeUndefined();
		expect(fake.data['other:one']).toEqual({ value: 2 });
	});
});

it('checks callback/options senders and rejects ambiguous callback parameters', async () => {
	const guards = await import('@/core/scrobbler/atproto/oauth-messages');
	const { oauthRedirectUri } = await import(
		'@/core/scrobbler/atproto/oauth-config'
	);
	const sender = {
		id: 'test-extension',
		frameId: 0,
		tab: {
			id: 1,
			index: 0,
			highlighted: false,
			active: true,
			pinned: false,
			incognito: false,
		},
		url: `${oauthRedirectUri}?code=test`,
	};
	expect(guards.isOAuthCallbackSender(sender)).toBe(true);
	for (const invalid of [
		{ ...sender, id: 'other' },
		{ ...sender, frameId: 1 },
		{ ...sender, tab: undefined },
		{ ...sender, url: `${oauthRedirectUri}/extra` },
		{ ...sender, url: 'https://evil.example/oauth/callback' },
	]) {
		expect(guards.isOAuthCallbackSender(invalid)).toBe(false);
	}
	expect(
		guards.isOAuthOptionsSender({
			id: 'test-extension',
			url: 'moz-extension://test/src/ui/options/index.html?p=accounts',
		}),
	).toBe(true);
	expect(guards.isOAuthOptionsSender(sender)).toBe(false);
	expect(
		guards.isOAuthCallbackSearch('?state=x&iss=https://as.example&code=y'),
	).toBe(true);
	for (const invalid of [
		undefined,
		{},
		'?state=x&code=y',
		'?state=x&state=z&iss=a&code=y',
		'?state=x&iss=a&code=y&error=access_denied',
	]) {
		expect(guards.isOAuthCallbackSearch(invalid)).toBe(false);
	}
});
