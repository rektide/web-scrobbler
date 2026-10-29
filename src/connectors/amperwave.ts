import type { Station } from '@/core/types';

const PLAYER_URI = 'https://player.amperwave.net/';

const NOWPLAYING_API_URI = 'https://api-nowplaying.amperwave.net/api/v1/';

/**
 * Matches the 10-second polling cadence of the Amperwave player and
 * the now-playing widgets themselves.
 */
const NOWPLAYING_POLL_MS = 10_000;

interface Performance {
	artist?: string;
	title?: string;
	album?: string;
	smallimage?: string;
	mediumimage?: string;
	largeimage?: string;
}

interface NowPlayingResponse {
	performances?: Performance[] | null;
}

interface StationConfigResponse {
	station?: {
		title?: string;
		code?: string;
		logo?: string;
	};
}

/**
 * Popup player URLs are `player.amperwave.net/<stationId>`. Station
 * sites embed a now-playing widget whose inline config carries the
 * same numeric station ID as `clarity_station_id`.
 */
function getStationId(): string | null {
	if (window.location.host === 'player.amperwave.net') {
		return window.location.pathname.match(/^\/(\d+)/)?.[1] ?? null;
	}

	const widgetConfig = (
		window as unknown as {
			_nowplaying_abacast_V6_widget_config?: {
				clarity_station_id?: string;
			};
		}
	)._nowplaying_abacast_V6_widget_config;

	return widgetConfig?.clarity_station_id ?? null;
}

const stationId = getStationId();

let station: Station | null = null;

/**
 * The popup player is a React app that currently fails to boot (its
 * `#main` container stays empty), so it exposes no readable DOM. The
 * player and the station-site widgets both poll the public now-playing
 * API; this connector fetches the same JSON, following the RadioCult
 * precedent.
 */
let currentPerformance: Performance | null = null;

function loadStation() {
	if (!stationId) {
		return;
	}

	void fetch(`${PLAYER_URI}station?uid=${stationId}`)
		.then((response) => response.json())
		.then((response: unknown) => {
			const config = (response as StationConfigResponse).station;
			if (!config) {
				return;
			}

			station = {
				uri: `${PLAYER_URI}${stationId}`,
				label: config.title ?? undefined,
				callSign: config.code ?? undefined,
				artworkUri: config.logo ?? undefined,
				identifiers: [
					{
						authorityUri: PLAYER_URI,
						value: stationId,
						kind: 'station-id',
						uri: `${PLAYER_URI}${stationId}`,
					},
				],
			};
			Connector.onStateChanged();
		})
		.catch((error: unknown) => {
			Util.debugLog(
				`Unable to load Amperwave station config: ${String(error)}`,
				'warn',
			);
		});
}

function loadNowPlaying() {
	if (!stationId) {
		return;
	}

	void fetch(
		`${NOWPLAYING_API_URI}prtplus/nowplaying/20/${stationId}/nowplaying.json`,
	)
		.then((response) => response.json())
		.then((response: unknown) => {
			const performances = (response as NowPlayingResponse).performances;
			currentPerformance = performances?.[0] ?? null;
			Connector.onStateChanged();
		})
		.catch((error: unknown) => {
			Util.debugLog(
				`Unable to load Amperwave now-playing data: ${String(error)}`,
				'warn',
			);
		});
}

// The first entry of the history array is the current performance; on
// station sites the widget DOM below takes precedence over these values.
Connector.getTrackInfo = () => {
	if (!currentPerformance) {
		return null;
	}

	return {
		artist: currentPerformance.artist ?? null,
		track: currentPerformance.title ?? null,
		album: currentPerformance.album || null,
		trackArt:
			currentPerformance.largeimage ??
			currentPerformance.mediumimage ??
			currentPerformance.smallimage ??
			null,
	};
};

// Now-playing widget injected into station site pages by
// `player.amperwave.net/widget/nowplaying-latest.min.js`.
Connector.playerSelector = '.nowplaying-widget-container';

Connector.trackSelector = `${Connector.playerSelector} .track`;

Connector.artistSelector = `${Connector.playerSelector} .artist-album`;

Connector.trackArtSelector = `${Connector.playerSelector} img.album-art`;

Connector.isTrackArtDefault = (url) => url?.includes('/no-art.');

// The popup player is the only Amperwave surface that plays audio; the
// station-site widget is metadata-only. Scrobble only while the tab is
// actually audible, following the AirKast precedent.
Connector.useTabAudibleApi();

Connector.getChannelId = () => stationId;

Connector.getStation = () => station;

Connector.getChannelLabel = () => station?.label ?? stationId;

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};

if (stationId) {
	loadStation();
	loadNowPlaying();
	setInterval(loadNowPlaying, NOWPLAYING_POLL_MS);
}
