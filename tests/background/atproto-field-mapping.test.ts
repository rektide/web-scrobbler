import { expect, test, vi } from 'vitest';
import Song from '@/core/object/song';
import {
	mapSongToRecord,
	mapToRocksky,
	mapToTeal,
} from '@/core/scrobbler/atproto/field-mapping';

const connector = {
	label: 'Example Radio',
	matches: ['*://*.radio.example/*'],
	js: 'example.js',
	id: 'example',
};

test('maps Teal listening source', () => {
	const song = new Song(
		{
			track: 'Test Track',
			artist: 'Test Artist',
			album: 'Test Album',
			duration: 120,
			originUrl: 'https://radio.example/player',
		},
		connector,
	);
	song.metadata.startTimestamp = 1_700_000_000;
	expect(mapToTeal(song)).toEqual({
		$type: 'fm.teal.feed.play',
		trackName: 'Test Track',
		artists: [{ artistName: 'Test Artist' }],
		releaseName: 'Test Album',
		duration: 120,
		playedTime: '2023-11-14T22:13:20.000Z',
		originUri: 'https://radio.example/player',
		musicServiceUri: 'https://radio.example/',
	});
});

test('maps Rocksky required fields, milliseconds and source hostname', () => {
	const song = new Song(
		{
			track: 'Track',
			artist: 'Artist',
			album: 'Album',
			albumArtist: 'Album Artist',
			duration: 123,
			originUrl: 'https://music.example:8443/track/1',
		},
		connector,
	);
	song.metadata.startTimestamp = 1_700_000_000;
	expect(mapToRocksky(song)).toEqual({
		$type: 'app.rocksky.scrobble',
		title: 'Track',
		artist: 'Artist',
		artists: [{ name: 'Artist' }],
		album: 'Album',
		albumArtist: 'Album Artist',
		duration: 123_000,
		createdAt: '2023-11-14T22:13:20.000Z',
		tags: ['music.example'],
	});
});

test('supplies required defaults and omits unavailable Teal optional fields', () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
	try {
		const song = new Song({}, connector);
		expect(mapSongToRecord('teal', song)).toEqual({
			$type: 'fm.teal.feed.play',
			trackName: '',
			playedTime: '2026-10-28T12:00:00.000Z',
		});
		expect(mapSongToRecord('rocksky', song)).toEqual({
			$type: 'app.rocksky.scrobble',
			title: 'Unknown',
			artist: 'Unknown',
			artists: [{ name: 'Unknown' }],
			album: 'Unknown',
			albumArtist: 'Unknown',
			duration: 0,
			createdAt: '2026-10-28T12:00:00.000Z',
			tags: ['radio.example'],
		});
	} finally {
		vi.useRealTimers();
	}
});

test('omits invalid music service URLs and falls back to connector tags', () => {
	const song = new Song(
		{ track: 'Track', originUrl: 'not a URL' },
		connector,
	);
	expect(mapToTeal(song)).not.toHaveProperty('musicServiceUri');
	expect(mapToRocksky(song).tags).toEqual(['radio.example']);
});
