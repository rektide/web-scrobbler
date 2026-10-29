import type { Station } from '@/core/types';
import {
	createFallbackStation,
	filterStationNames,
	parseRadioCultStation,
} from './radiocult/station';

const stationOverrides: Record<string, Partial<Station>> = {
	'mountain-chill': {
		tagline: 'Ninety-five five Mountain Chill',
	},
};

const getStationId = () => {
	const stationId = window.location.pathname.match(
		/^\/embed\/(?:dock|player|popout|square-player)\/([^/]+)/,
	)?.[1];
	return stationId ? decodeURIComponent(stationId) : null;
};

const stationId = getStationId();
let station = stationId
	? filterStationNames(
			createFallbackStation(
				stationId,
				document.title.replace(/ \| RadioCult$/, ''),
			),
			true,
		)
	: null;

if (stationId) {
	void fetch(
		`https://api.radiocult.fm/api/station/${encodeURIComponent(stationId)}`,
	)
		.then((response) => {
			if (!response.ok) {
				throw new Error(
					`RadioCult station request failed: ${response.status}`,
				);
			}
			return response.json();
		})
		.then((response: unknown) => {
			station = filterStationNames(
				{
					...parseRadioCultStation(stationId, response),
					...stationOverrides[stationId],
				},
				true,
			);
			Connector.onStateChanged();
		})
		.catch((error: unknown) => {
			Util.debugLog(
				`Unable to load RadioCult station metadata: ${String(error)}`,
				'warn',
			);
		});
}

Connector.playerSelector = '#__next';
Connector.trackSelector = '[data-testid="live-now.title"]';
Connector.artistSelector = '[data-testid="live-now.artist"]';
Connector.trackArtSelector = 'img[alt="Now playing artwork"]';

Connector.isPlaying = () => {
	const audio = document.querySelector('[data-testid="embed.player.audio"]');
	return audio instanceof HTMLAudioElement && !audio.paused && !audio.ended;
};

Connector.getChannelId = getStationId;
Connector.getStation = () => station;
Connector.getChannelLabel = () => station?.label ?? getStationId();
Connector.getOriginUrl = () =>
	Connector.topLevelUrl || document.referrer || window.location.href;
