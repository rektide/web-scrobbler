import { expect, test } from 'vitest';

import type { BaseSong } from '@/core/object/song';
import { mapToTeal } from '@/core/scrobbler/atproto/field-mapping';

test('maps the music service to hostname and URI projections', () => {
	const song = {
		getTrack: () => 'Test Track',
		getArtist: () => 'Test Artist',
		getAlbum: () => undefined,
		getDuration: () => undefined,
		getOriginUrl: () => 'https://indieradioaccess.org/player/krkq.html',
		metadata: { startTimestamp: 1 },
		connector: { matches: ['https://app.radiocult.fm/*'] },
	} as unknown as BaseSong;

	expect(mapToTeal(song)).toMatchObject({
		$type: 'fm.teal.feed.play',
		originUri: 'https://indieradioaccess.org/player/krkq.html',
		musicServiceUri: 'https://indieradioaccess.org/',
	});
});
