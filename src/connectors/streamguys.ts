import type { Station } from '@/core/types';

const SGPLAYER_URI = 'https://player.streamguys.com/';

/**
 * Stations running self-hosted SGplayer deployments under their own
 * hostnames, keyed by hostname. The hosted player encodes the station
 * in the first path segment; on a self-hosted deployment that segment
 * is a site path, so the station is the site itself.
 */
const SELF_HOSTED_STATIONS: Record<string, Station> = {
	'xpn.org': {
		uri: 'https://xpn.org/',
		label: 'WXPN',
		callSign: 'WXPN',
	},
};

const getSelfHostedStation = () => {
	return SELF_HOSTED_STATIONS[window.location.hostname] ?? null;
};

const getStationSlug = () => {
	const stationSlug = window.location.pathname.match(/^\/([^/]+)/)?.[1];

	return stationSlug ? decodeURIComponent(stationSlug) : null;
};

const getStationLabel = () => {
	const selfHostedStation = getSelfHostedStation();

	if (selfHostedStation) {
		return selfHostedStation.label;
	}

	const stationSlug = getStationSlug();
	const pageTitle = document.title.replace(/\s*SGPlayer$/, '').trim();

	return pageTitle || stationSlug || document.title;
};

const getStation = () => {
	const selfHostedStation = getSelfHostedStation();

	if (selfHostedStation) {
		return selfHostedStation;
	}

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

/**
 * `.sgplayer` covers self-hosted deployments (e.g. WXPN) that wrap
 * SGplayer without the hosted `.sg-content` container.
 */
Connector.playerSelector = ['.sg-content', '.sgplayer'];

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

	if (playStateIcon) {
		return playStateIcon.classList.contains('fa-pause');
	}

	// Self-hosted deployments (e.g. WXPN) expose playback state through
	// the play control's title attribute instead.
	const playControl = document.querySelector('.sg-control-play a');

	if (playControl) {
		return playControl.getAttribute('title') === 'Pause';
	}

	return null;
};

Connector.getChannelId = () => {
	// Self-hosted deployments have no hosted station slug to derive.
	return getSelfHostedStation() ? null : getStationSlug();
};

Connector.getStation = getStation;

Connector.getChannelLabel = getStationLabel;

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
