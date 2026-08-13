import { expect, test } from 'vitest';

import Song from '@/core/object/song';
import { mapToTeal } from '@/core/scrobbler/atproto/field-mapping';

test('maps listening source and station metadata', () => {
	const song = new Song(
		{
			track: 'Test Track',
			artist: 'Test Artist',
			originUrl: 'https://indieradioaccess.org/player/krkq.html',
			station: {
				uri: 'https://mountainchill.com/',
				label: '95.5 Mountain Chill',
				name: 'Mountain Chill',
				callSign: 'KRKQ',
				tagline: 'Ninety-five five Mountain Chill',
				frequencyHz: 95_500_000,
				band: 'FM',
				identifiers: [
					{
						authorityUri: 'https://radiocult.fm/',
						value: 'mountain-chill',
						kind: 'slug',
						uri: 'https://app.radiocult.fm/embed/square-player/mountain-chill',
					},
				],
			},
		},
		{
			label: 'RadioCult',
			matches: ['https://app.radiocult.fm/*'],
			js: 'radiocult.js',
			id: 'radiocult',
		},
	);

	expect(mapToTeal(song)).toMatchObject({
		$type: 'fm.teal.feed.play',
		originUri: 'https://indieradioaccess.org/player/krkq.html',
		musicServiceUri: 'https://indieradioaccess.org/',
		station: {
			uri: 'https://mountainchill.com/',
			label: '95.5 Mountain Chill',
			name: 'Mountain Chill',
			callSign: 'KRKQ',
			tagline: 'Ninety-five five Mountain Chill',
			frequencyHz: 95_500_000,
			band: 'FM',
			identifiers: [
				{
					authorityUri: 'https://radiocult.fm/',
					value: 'mountain-chill',
					kind: 'slug',
					uri: 'https://app.radiocult.fm/embed/square-player/mountain-chill',
				},
			],
		},
	});
});
