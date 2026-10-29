import type { Station } from '@/core/types';

const SGPLAYER_URI = 'https://player.streamguys.com/';

const getStationSlug = () => {
	const stationSlug = window.location.pathname.match(/^\/([^/]+)/)?.[1];

	return stationSlug ? decodeURIComponent(stationSlug) : null;
};

const getStationLabel = () => {
	const stationSlug = getStationSlug();
	const pageTitle = document.title.replace(/\s*SGPlayer$/, '').trim();

	return pageTitle || stationSlug || document.title;
};

const getStation = () => {
	const stationSlug = getStationSlug();

	if (!stationSlug) {
		return null;
	}

	const stationUri = `${SGPLAYER_URI}${encodeURIComponent(stationSlug)}/`;

	const station: Station = {
		uri: stationUri,
		label: getStationLabel(),
		identifiers: [
			{
				authorityUri: SGPLAYER_URI,
				value: stationSlug,
				kind: 'slug',
				uri: stationUri,
			},
		],
	};

	return station;
};

Connector.playerSelector = '.sg-content';

/**
 * Ordered selector lists cover the standard and bar layouts of
 * SGplayer 3.x.
 */
Connector.trackSelector = [
	'.sg-content-info .sg-title',
	'.sg-bar-player .sg-content-info-row .sg-title',
];

Connector.artistSelector = [
	'.sg-content-info .sg-artist',
	'.sg-bar-player .sg-content-info-row .sg-artist',
];

Connector.albumSelector = [
	'.sg-content-info .sg-album',
	'.sg-bar-player .sg-content-info-row .sg-album',
];

/**
 * SGplayer renders artwork as a CSS background image, which
 * `extractImageUrlFromSelectors` falls back to.
 */
Connector.trackArtSelector = [
	'#art',
	'.sg-player-art',
	'.sg-hero-row .sg-hero-art',
	'.sg-art',
];

Connector.isPlaying = () => {
	const audio = document.querySelector('audio[id^="sound_"]');

	if (audio instanceof HTMLAudioElement) {
		return !audio.paused && !audio.ended;
	}

	const playStateIcon = document.querySelector('#playPauseButton span');

	return playStateIcon?.classList.contains('fa-pause') ?? null;
};

Connector.getChannelId = getStationSlug;

Connector.getStation = getStation;

Connector.getChannelLabel = getStationLabel;

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
