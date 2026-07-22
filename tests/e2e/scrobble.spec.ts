import { test, expect } from './fixtures';
import { createRecordCalls, resetCreateRecordCalls } from './mocks/pds';

test.beforeEach(() => {
	resetCreateRecordCalls();
});

const HARNESS_URL = '/tests/e2e/harness/index.html';

const mockConnector = {
	label: 'KEXP',
	matches: ['*://*.kexp.org/*'],
	js: 'kexp.js',
	id: 'kexp',
};

test('scrobble writes fm.teal.alpha.feed.play record to PDS', async ({ page }) => {
	await page.goto(HARNESS_URL);

	await page.waitForFunction(() => window.ready === true);

	await page.evaluate(async () => {
		const session = (window as unknown as { testSession: unknown }).testSession as {
			info: { sub: string };
		};
		await window.atproto.storeOAuthSession({
			sessionID: session.info.sub,
			sessionName: 'test.bsky.social',
			oauthSession: session as never,
		});
	});

	const song = {
		track: 'Test Track',
		artist: 'Test Artist',
		album: 'Test Album',
		duration: 180,
	};

	const result = await page.evaluate(async (songData) => {
		const songs = [{
			getTrack: () => songData.track,
			getArtist: () => songData.artist,
			getAlbum: () => songData.album,
			getAlbumArtist: () => undefined,
			getDuration: () => songData.duration,
			getOriginUrl: () => 'https://open.spotify.com/track/123',
			metadata: {
				label: 'Spotify',
				startTimestamp: Math.floor(Date.now() / 1000),
			},
			connector: { label: 'Spotify', matches: ['*://open.spotify.com/*'], js: 'spotify.js', id: 'spotify' },
		}];
		return window.atproto.scrobble(songs, true);
	}, song);

	const results = await result;
	expect(results).toHaveLength(1);
	expect(results[0]).toBe('ok');

	expect(createRecordCalls.length).toBeGreaterThanOrEqual(1);

	const tealCall = createRecordCalls.find((c) => c.collection === 'fm.teal.alpha.feed.play');
	expect(tealCall).toBeDefined();
	expect(tealCall!.record.trackName).toBe('Test Track');
	expect(tealCall!.record.artists).toEqual([{ artistName: 'Test Artist' }]);
	expect(tealCall!.record.releaseName).toBe('Test Album');
	expect(tealCall!.record.duration).toBe(180);
	expect(tealCall!.record.musicServiceBaseDomain).toBe('open.spotify.com');
});

test('scrobble writes app.rocksky.scrobble record to PDS', async ({ page }) => {
	await page.goto(HARNESS_URL);

	await page.waitForFunction(() => window.ready === true);

	await page.evaluate(async () => {
		const session = (window as unknown as { testSession: unknown }).testSession as {
			info: { sub: string };
		};
		await window.atproto.storeOAuthSession({
			sessionID: session.info.sub,
			sessionName: 'test.bsky.social',
			oauthSession: session as never,
		});
	});

	const result = await page.evaluate((connector) => {
		const songs = [{
			getTrack: () => 'Rocksky Track',
			getArtist: () => 'Rocksky Artist',
			getAlbum: () => 'Rocksky Album',
			getAlbumArtist: () => undefined,
			getDuration: () => 200,
			getOriginUrl: () => undefined,
			metadata: { label: connector.label, startTimestamp: Math.floor(Date.now() / 1000) },
			connector,
		}];
		return window.atproto.scrobble(songs, true);
	}, mockConnector);

	const results = await result;
	expect(results).toHaveLength(1);
	expect(results[0]).toBe('ok');

	const rockskyCall = createRecordCalls.find((c) => c.collection === 'app.rocksky.scrobble');
	expect(rockskyCall).toBeDefined();
	expect(rockskyCall!.record.title).toBe('Rocksky Track');
	expect(rockskyCall!.record.artist).toBe('Rocksky Artist');
	expect(rockskyCall!.record.duration).toBe(200000);
	expect(rockskyCall!.record.tags).toEqual(['kexp.org']);
});
