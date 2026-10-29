import type { Station } from '@/core/types';

const songOnNow = '.songLineOnNow';

/**
 * WYCE-specific deployment wrapper: third-party sites embedding the SNS
 * Cirrus Encore widget (ssiEncore DOM) under their own hostname, keyed
 * by hostname, then by first path segment. grcmc.org/wyce/listen is the
 * only known third-party ssiEncore deployment (2026-10 census): embed.js
 * injects the player into a recursive same-origin frame, so no
 * *.securenetsystems.net frame exists to match.
 */
const EMBEDDED_STATIONS: Record<string, Record<string, Station>> = {
	'grcmc.org': {
		wyce: {
			uri: 'https://grcmc.org/wyce/listen',
			label: 'WYCE',
			callSign: 'WYCE',
		},
	},
};

const getStation = () => {
	const stationsByPath = EMBEDDED_STATIONS[window.location.hostname];

	if (!stationsByPath) {
		return null;
	}

	const pathSegment = window.location.pathname
		.match(/^\/([^/]+)/)?.[1]
		?.toLowerCase();

	return (pathSegment && stationsByPath[pathSegment]) || null;
};

Connector.playerSelector = [
	// Current generation (WWOD, WAMU HD2 "V5 Player", WYCE full page)
	'.playlistSongArea',
	// ssiEncore embed generation (WYCE grcmc.org frame)
	'[class*="ssiEncore_songTitle"]',
	// Canvas generation (KFNSFM "/ce/"; one sampled station)
	'#songTitle',
	// Legacy generation
	'#playerDiv',
];

Connector.artistSelector = [
	// Current generation (WWOD, WAMU HD2)
	`${songOnNow} .songDetail .songArtist`,
	// ssiEncore embed generation (WYCE grcmc.org frame)
	'.ssiEncore_songArtist',
	// Canvas generation (KFNSFM)
	'#songArtist',
	// Legacy generation
	'#now-playing-artist',
];

Connector.trackSelector = [
	// Current generation (WWOD, WAMU HD2)
	`${songOnNow} .songDetail .songTitle`,
	// ssiEncore embed generation (WYCE grcmc.org frame)
	'.ssiEncore_songTitle',
	// Canvas generation (KFNSFM)
	'#songTitle',
	// Legacy generation
	'#now-playing-title',
];

Connector.albumSelector = [
	// Current generation (WWOD, WAMU HD2)
	`${songOnNow} .songDetail .songAlbum`,
	// ssiEncore embed generation (WYCE grcmc.org frame)
	'.ssiEncore_songAlbum',
];

Connector.trackArtSelector = [
	// Current generation (WWOD, WAMU HD2)
	`${songOnNow} img.songCover`,
	// ssiEncore embed generation (WYCE grcmc.org frame; empty on sample)
	'.ssiEncore_songCover',
	// Legacy generation
	'#now-playing-album-art',
];

Connector.durationSelector = `${songOnNow} .songDuration`;

Connector.currentTimeSelector = `${songOnNow} .progressTime`;

Connector.isTrackArtDefault = (url) =>
	Boolean(url?.match(/album-art(-default)?.png$/));

Connector.isPlaying = () =>
	Util.isElementVisible([
		// Current generation (WWOD)
		'.songPlaying .pauseButton',
		// ssiEncore embed generation (WYCE grcmc.org frame)
		'.ssiEncore_pauseButton',
		// Legacy generation
		'#transport-pause',
	]);

Connector.getStation = getStation;
