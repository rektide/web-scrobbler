import type { Station } from '@/core/types';

const STREAMON_URI = 'https://listen.streamon.fm/';

const filter = MetadataFilter.createFilter({
	track: [
		MetadataFilter.removeCleanExplicit,
		MetadataFilter.removeRemastered,
		MetadataFilter.removeVersion,
		MetadataFilter.removeLive,
		removeHotNewPrefix,
	],
});

/**
 * The platform's station identifier is exposed as the cfg_username
 * inline-script global; it is stable across the per-station URL slugs
 * (/coloradosound and /kjac both serve The Colorado Sound, KJAC).
 */
function getStationSlug() {
	const cfgUsername = (window as unknown as { cfg_username?: string })
		.cfg_username;

	if (cfgUsername) {
		return cfgUsername;
	}

	const stationSlug = window.location.pathname.match(/^\/([^/]+)/)?.[1];

	return stationSlug ? decodeURIComponent(stationSlug) : null;
}

/**
 * SoundStack-hosted players (mystreamplayer.com, GotRadio, Live365 and
 * 181.fm embeds) serve the same widget without cfg_username and often
 * without a URL slug; fall back to a host-based identifier there.
 */
function getStationId() {
	return getStationSlug() ?? window.location.hostname;
}

function getStation(): Station {
	const stationSlug = getStationSlug();
	const stationId = getStationId();

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
		// Claim a StreamOn platform slug only when one was actually
		// derived; host-root embeds stay identified by their URI alone.
		...(stationSlug
			? {
					identifiers: [
						{
							authorityUri: STREAMON_URI,
							value: stationSlug,
							kind: 'slug',
							uri,
						},
					],
				}
			: {}),
	};
}

const station = getStation();

// The webplayer is a custom jPlayer GUI shared with the SoundStack-hosted
// players. site.js writes the polled now-playing metadata
// (yp.cdnstream1.com) into #song/.fill_song and #artist/.fill_artist,
// optionally appending an album span to #artist.
Connector.playerSelector = '.flag--large__content, .jp-jplayer ~ .player';

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

	// The play control shows a stop icon while the stream runs; embeds
	// without the media element additionally require a resolved elapsed
	// time (ported from the SoundStack connector).
	const playButton = document.querySelector('#playbtn');

	return (
		Boolean(Util.getTextFromSelectors('#current-time')?.match(/\d+:\d+/)) &&
		(playButton?.classList.contains('jp-stopx') ?? null)
	);
};

Connector.scrobblingDisallowedReason = () => {
	if (Connector.getTrack()?.match(/After This (Break|Message)/i)) {
		return 'IsAd';
	}

	return null;
};

Connector.getChannelId = getStationId;

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	return station.label ?? getStationId();
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};

Connector.applyFilter(filter);

function removeHotNewPrefix(track: string) {
	return track.replace(/^(Hot|new)-/, '');
}
