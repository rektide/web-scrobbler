import type { Station } from '@/core/types';

const WITR_URI = 'https://witr.rit.edu/';

/**
 * WITR's logger API lists the newest spin first. The site-wide player
 * streams the FM feed, which is logged with `underground=false` (the
 * Underground stream is a separate logger feed).
 */
const TRACKS_API_URI =
	'https://logger.witr.rit.edu/api/tracks/list?count=1&underground=false';

interface WitrStreamingLink {
	artwork?: string;
}

interface WitrTrack {
	id?: number;
	title?: string;
	artist?: string;
	streaming?: WitrStreamingLink[];
}

interface WitrTracksResponse {
	tracks?: WitrTrack[];
}

const station: Station = {
	uri: WITR_URI,
	label: 'WITR',
	callSign: 'WITR',
};

/**
 * The React app populates its streaming-bar media preview from the same
 * public logger API, but the rendered now-playing DOM is sparse and
 * unverified; reading the API directly (as radiocult does) works from
 * any page on the site.
 */
let currentTrack: WitrTrack | null = null;

async function updateCurrentTrack(): Promise<void> {
	try {
		const response = await fetch(TRACKS_API_URI);
		const responseJson = (await response.json()) as WitrTracksResponse;
		currentTrack = responseJson.tracks?.[0] ?? null;
	} catch (error: unknown) {
		Util.debugLog(
			`Unable to load WITR track metadata: ${String(error)}`,
			'warn',
		);
	}

	Connector.onStateChanged();
}

Connector.playerSelector = '.StreamingBar';

Connector.getArtist = () => currentTrack?.artist ?? null;

Connector.getTrack = () => currentTrack?.title ?? null;

Connector.getTrackArt = () =>
	currentTrack?.streaming?.find((link) => link.artwork)?.artwork ?? null;

Connector.getUniqueID = () =>
	currentTrack?.id === undefined ? null : String(currentTrack.id);

Connector.isPlaying = () => {
	const audio = document.querySelector('audio.player, audio#player');

	return audio instanceof HTMLAudioElement && !audio.paused && !audio.ended;
};

Connector.getStation = () => {
	return station;
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};

void updateCurrentTrack();
setInterval(updateCurrentTrack, 15000);
