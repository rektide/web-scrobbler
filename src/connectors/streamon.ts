import type { Station } from '@/core/types';

const STREAMON_URI = 'https://listen.streamon.fm/';

/**
 * The platform's station identifier is exposed as the cfg_username
 * inline-script global; it is stable across the per-station URL slugs
 * (/coloradosound and /kjac both serve The Colorado Sound, KJAC).
 */
function getStationId() {
	const cfgUsername = (window as unknown as { cfg_username?: string })
		.cfg_username;

	if (cfgUsername) {
		return cfgUsername;
	}

	const stationSlug = window.location.pathname.match(/^\/([^/]+)/)?.[1];

	return stationSlug ? decodeURIComponent(stationSlug) : null;
}

function getStation(): Station | null {
	const stationId = getStationId();

	if (!stationId) {
		return null;
	}

	const uri =
		Util.getAttrFromSelectors('meta[property="og:url"]', 'content') ??
		window.location.href;
	const label = Util.getAttrFromSelectors(
		'meta[property="og:title"]',
		'content',
	);
	const artworkUri = Util.getAttrFromSelectors(
		'meta[property="og:image"]',
		'content',
	);

	return {
		uri,
		...(label ? { label } : {}),
		...(artworkUri ? { artworkUri } : {}),
		...(stationId.match(/^[A-Z]{3,4}$/) ? { callSign: stationId } : {}),
		identifiers: [
			{
				authorityUri: STREAMON_URI,
				value: stationId,
				kind: 'slug',
				uri,
			},
		],
	};
}

const station = getStation();

// The webplayer is a custom jPlayer GUI. site.js writes the polled
// now-playing metadata (yp.cdnstream1.com) into #song/.fill_song and
// #artist/.fill_artist, optionally appending an album span to #artist.
Connector.playerSelector = '.flag--large__content';

Connector.trackSelector = '#song';

Connector.artistSelector = '.fill_artist';

Connector.albumSelector = '#artist .album';

Connector.trackArtSelector = '.songimg';

Connector.isPlaying = () => {
	// jPlayer creates its HTML5 media element inside one of the jp-jplayer
	// divs, one per supplied media type.
	const media = document.querySelector(
		'#jpdivm4a audio, #jpdivmp3 audio, #jpdivm4v video',
	);

	if (media instanceof HTMLMediaElement) {
		return !media.paused && !media.ended;
	}

	// The play control shows a stop icon while the stream runs.
	const playButton = document.querySelector('#playbtn');

	return playButton?.classList.contains('jp-stopx') ?? null;
};

Connector.getChannelId = getStationId;

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	return station?.label ?? getStationId();
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
