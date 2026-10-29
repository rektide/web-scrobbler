import { test, expect } from './fixtures';

const HARNESS_URL = '/tests/e2e/harness/index.html';

const mockConnector = {
	label: 'KEXP',
	matches: ['*://*.kexp.org/*'],
	js: 'kexp.js',
	id: 'kexp',
};

test('scrobble writes fm.teal.feed.play record to PDS', async ({
	page,
	createRecordCalls,
}) => {
	await page.goto(HARNESS_URL);

	await page.waitForFunction(() => window.ready === true);

	await page.evaluate(async () => {
		await window.seedSession();
	});

	const song = {
		track: 'Test Track',
		artist: 'Test Artist',
		album: 'Test Album',
		duration: 180,
	};

	const result = await page.evaluate(async (songData) => {
		const song = new window.Song(
			{
				...songData,
				originUrl: 'https://open.spotify.com/track/123',
			},
			{
				label: 'Spotify',
				matches: ['*://open.spotify.com/*'],
				js: 'spotify.js',
				id: 'spotify',
			},
		);
		return window.atproto.scrobble([song], true);
	}, song);

	const results = await result;
	expect(results).toHaveLength(1);
	expect(results[0]).toBe('ok');

	expect(createRecordCalls.length).toBeGreaterThanOrEqual(1);

	const tealCall = createRecordCalls.find(
		(c) => c.collection === 'fm.teal.feed.play',
	);
	expect(tealCall).toBeDefined();
	expect(tealCall!.record.trackName).toBe('Test Track');
	expect(tealCall!.record.artists).toEqual([{ artistName: 'Test Artist' }]);
	expect(tealCall!.record.releaseName).toBe('Test Album');
	expect(tealCall!.record.duration).toBe(180);
	expect(tealCall!.record.originUri).toBe(
		'https://open.spotify.com/track/123',
	);
	expect(tealCall!.record.musicServiceUri).toBe('https://open.spotify.com/');
});

test('scrobble writes app.rocksky.scrobble record to PDS', async ({
	page,
	createRecordCalls,
}) => {
	await page.goto(HARNESS_URL);

	await page.waitForFunction(() => window.ready === true);

	await page.evaluate(async () => {
		await window.seedSession();
	});

	const result = await page.evaluate((connector) => {
		const song = new window.Song(
			{
				track: 'Rocksky Track',
				artist: 'Rocksky Artist',
				album: 'Rocksky Album',
				duration: 200,
			},
			connector,
		);
		return window.atproto.scrobble([song], true);
	}, mockConnector);

	const results = await result;
	expect(results).toHaveLength(1);
	expect(results[0]).toBe('ok');

	const rockskyCall = createRecordCalls.find(
		(c) => c.collection === 'app.rocksky.scrobble',
	);
	expect(rockskyCall).toBeDefined();
	expect(rockskyCall!.record.title).toBe('Rocksky Track');
	expect(rockskyCall!.record.artist).toBe('Rocksky Artist');
	expect(rockskyCall!.record.albumArtist).toBe('Rocksky Artist');
	expect(rockskyCall!.record.duration).toBe(200000);
	expect(rockskyCall!.record.tags).toEqual(['kexp.org']);
});
