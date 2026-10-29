/**
 * EXPERIMENTAL / QUARANTINED — headless-poller spike (ses_e762fc756ffezNc4Ggwoyns4Ob).
 *
 * KCOQ 98.9 (Steamboat Springs) has no scrobblable player page: the site's
 * LISTEN LIVE link opens a bare audio/mpeg stream document with no site DOM.
 * This connector runs ON that media document (content scripts inject into
 * Chromium media documents; the player is a light-DOM <video> element), and
 * pulls now-playing metadata from the site's OneCMS JSON API instead of any
 * player DOM, polling on a timer like witr.ts does.
 *
 * DO NOT UPSTREAM without discussion with the human running the spike:
 * the architecture is explicitly unlikely to ship as-is. Design doc:
 * web-scrobbler-teal `.test-agent/radio-stations/bgpoller-experiment.glm53m.md`.
 */

import type { Station } from '@/core/types';

const STATION_URI = 'https://steamboatradio.com/kcoq-listen-live/';

/**
 * OneCMS now-playing API: JSON array, current track first. Station-specific
 * path token (1573/kcoq). Sends `Access-Control-Allow-Origin: *`, so the
 * fetch works from the stream-tab origin with no host permission.
 */
const NOW_PLAYING_API_URI = 'https://api.itmwpb.com/nowplaying/v4/1573/kcoq';

interface NowPlayingTrack {
	name?: string;
	artist?: string;
	album?: string;
	image_url?: string;
}

const station: Station = {
	uri: STATION_URI,
	label: 'KCOQ',
	callSign: 'KCOQ',
};

let currentTrack: NowPlayingTrack | null = null;

async function updateNowPlaying(): Promise<void> {
	try {
		const response = await fetch(NOW_PLAYING_API_URI);
		const responseJson = (await response.json()) as NowPlayingTrack[];
		currentTrack = responseJson?.[0] ?? null;
	} catch (error: unknown) {
		// Keep the last known track on API errors; playback itself is
		// reported by the media element regardless of metadata freshness.
		Util.debugLog(
			`Unable to load KCOQ now-playing metadata: ${String(error)}`,
			'warn',
		);
	}

	Connector.onStateChanged();
}

/**
 * No player DOM to observe (`playerSelector` stays null = starter's manual
 * mode); this connector drives state changes itself from the poll timer.
 */

Connector.getArtist = () => currentTrack?.artist ?? null;

Connector.getTrack = () => currentTrack?.name ?? null;

Connector.getAlbum = () => currentTrack?.album || null;

Connector.getTrackArt = () => currentTrack?.image_url || null;

/**
 * The API exposes no track id; a composite is enough for song-change
 * detection alongside artist/track/album.
 */
Connector.getUniqueID = () =>
	currentTrack?.artist && currentTrack?.name
		? `${currentTrack.artist}::${currentTrack.name}`
		: null;

/**
 * Bare media document: Chromium renders audio files as a light-DOM
 * `<video autoplay controls>` (no `<audio>`); Firefox uses `<audio>`.
 */
Connector.isPlaying = () => {
	const media = document.querySelector('audio, video');

	return media instanceof HTMLMediaElement && !media.paused && !media.ended;
};

Connector.getStation = () => station;

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || window.location.href;
};

void updateNowPlaying();
setInterval(updateNowPlaying, 15000);
