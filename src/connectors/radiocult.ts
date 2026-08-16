import type { Station } from '@/core/types';
import {
	createFallbackStation,
	filterStationNames,
	parseRadioCultStation,
} from './radiocult/station.ts';

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
let rawStation = stationId
	? createFallbackStation(
			stationId,
			document.title.replace(/ \| RadioCult$/, ''),
		)
	: null;
let shouldStripTrademarkSymbols = true;
let station = rawStation
	? filterStationNames(rawStation, shouldStripTrademarkSymbols)
	: null;

function updateStation() {
	station = rawStation
		? filterStationNames(rawStation, shouldStripTrademarkSymbols)
		: null;
	Connector.onStateChanged();
}

void Util.getOption('RadioCult', 'stripTrademarkSymbols').then((value) => {
	shouldStripTrademarkSymbols = value ?? true;
	updateStation();
});

if (stationId) {
	void fetch(
		`https://api.radiocult.fm/api/station/${encodeURIComponent(stationId)}`,
	)
		.then((response) => response.json())
		.then((response: unknown) => {
			rawStation = {
				...parseRadioCultStation(stationId, response),
				...stationOverrides[stationId],
			};
			updateStation();
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

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	const stationId = getStationId();
	if (!station) {
		return stationId;
	}
	return station.label;
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
