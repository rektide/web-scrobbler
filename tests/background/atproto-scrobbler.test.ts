import '#/mocks/webextension-polyfill';
import browser from 'webextension-polyfill';
import { beforeEach, expect, it, vi } from 'vitest';
import Song from '@/core/object/song';
import { ServiceCallResult } from '@/core/object/service-call-result';
import AtProtoScrobbler from '@/core/scrobbler/atproto/atproto-scrobbler';

const auth = vi.hoisted(() => ({
	account: vi.fn(),
	restore: vi.fn(),
	handle: vi.fn(),
	signOut: vi.fn(),
}));
vi.mock('@/core/scrobbler/atproto/oauth-client', () => ({
	getOAuthAccount: auth.account,
	oauthClient: { restore: auth.restore },
	signOutAtProto: auth.signOut,
	requestOAuthLock: (_name: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('@/util/communication', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/util/communication')>()),
	setupBackgroundListeners: vi.fn(),
}));

const song = new Song(
	{ track: 'Track', artist: 'Artist', duration: 120 },
	{ id: 'example', label: 'Example', matches: [], js: 'example.js' },
);

beforeEach(async () => {
	vi.resetAllMocks();
	await browser.storage.local.clear();
	auth.account.mockResolvedValue({ did: 'did:plc:example' });
	auth.restore.mockResolvedValue({
		did: 'did:plc:example',
		handle: auth.handle,
	});
	auth.handle.mockImplementation(async () =>
		Response.json({ uri: 'at://example/record', cid: 'test-cid' }),
	);
});

it('writes both collections by default through the restored OAuth session', async () => {
	const scrobbler = new AtProtoScrobbler();
	expect(await scrobbler.scrobble([song], false)).toEqual([
		ServiceCallResult.RESULT_OK,
	]);
	expect(auth.restore).toHaveBeenCalledWith('did:plc:example');
	const bodies = auth.handle.mock.calls.map(([, init]) =>
		JSON.parse(init.body as string),
	);
	expect(bodies).toEqual([
		expect.objectContaining({
			repo: 'did:plc:example',
			collection: 'fm.teal.feed.play',
			record: expect.objectContaining({ trackName: 'Track' }),
		}),
		expect.objectContaining({
			collection: 'app.rocksky.scrobble',
			record: expect.objectContaining({
				title: 'Track',
				duration: 120_000,
			}),
		}),
	]);
});

it('persists collection preferences and only writes selected destinations', async () => {
	const scrobbler = new AtProtoScrobbler();
	await scrobbler.setLexiconEnabled('teal', false);
	expect(await new AtProtoScrobbler().getEnabledLexicons()).toEqual({
		teal: false,
		rocksky: true,
	});
	expect(await scrobbler.scrobble([song], true)).toEqual(['ok']);
	expect(auth.handle).toHaveBeenCalledOnce();
	expect(JSON.parse(auth.handle.mock.calls[0][1].body).collection).toBe(
		'app.rocksky.scrobble',
	);
});

it('returns native auth/error results without throwing and continues selected writes', async () => {
	const scrobbler = new AtProtoScrobbler();
	auth.account.mockResolvedValueOnce(undefined);
	expect(await scrobbler.scrobble([song, song], false)).toEqual([
		'error-auth',
		'error-auth',
	]);
	auth.restore.mockRejectedValueOnce(new Error('offline'));
	expect(await scrobbler.scrobble([song], false)).toEqual(['error-other']);
	auth.handle.mockResolvedValueOnce(new Response(null, { status: 401 }));
	expect(await scrobbler.scrobble([song], false)).toEqual(['error-auth']);
	expect(auth.handle).toHaveBeenCalledTimes(2);
	auth.handle.mockResolvedValueOnce(new Response(null, { status: 503 }));
	expect(await scrobbler.scrobble([song], false)).toEqual(['error-other']);
});

it('legacy credentials require reauthorization and explicit signout preserves preferences', async () => {
	auth.account.mockResolvedValue(undefined);
	await browser.storage.local.set({
		AtProto: {
			sessionID: 'old',
			sessionName: 'old name',
			oauthSession: { old: true },
			isAuthStarted: true,
			lexicons: { teal: false, rocksky: true },
		},
		unrelated: { preserved: true },
	});
	const scrobbler = new AtProtoScrobbler();
	expect(await scrobbler.needsReauthorization()).toBe(true);
	await expect(scrobbler.getSession()).rejects.toThrow('error-auth');
	await scrobbler.clearAuthorization();
	expect(auth.signOut).toHaveBeenCalledOnce();
	expect(await browser.storage.local.get()).toEqual({
		AtProto: { lexicons: { teal: false, rocksky: true } },
		unrelated: { preserved: true },
	});
});

it('now-playing and love are intentional no-ops', async () => {
	const scrobbler = new AtProtoScrobbler();
	expect(await scrobbler.sendNowPlaying()).toBe('ok');
	expect(await scrobbler.sendPaused()).toBe('ok');
	expect(await scrobbler.sendResumedPlaying()).toBe('ok');
	expect(await scrobbler.toggleLove()).toEqual({});
	expect(auth.handle).not.toHaveBeenCalled();
});
