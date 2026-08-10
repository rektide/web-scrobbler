export {};

interface Station {
	label: string;
	name: string;
	callSign?: string;
	slug: string;
	tagline?: string;
	frequencyHz?: number;
	band?: string;
	originUrl: string;
}

const stations: Record<string, Station> = {
	'mountain-chill': {
		label: '95.5 Mountain Chill',
		name: 'Mountain Chill',
		callSign: 'KRKQ',
		slug: 'mountain-chill',
		tagline: 'Ninety-five five Mountain Chill',
		frequencyHz: 95_500_000,
		band: 'FM',
		originUrl: 'https://indieradioaccess.org/player/krkq.html',
	},
};

const getStationId = () =>
	window.location.pathname.match(/^\/embed\/square-player\/([^/]+)/)?.[1] ??
	null;

Connector.playerSelector = '#__next';

Connector.trackSelector = '[data-testid="live-now.title"]';

Connector.artistSelector = '[data-testid="live-now.artist"]';

Connector.trackArtSelector = 'img[alt="Now playing artwork"]';

Connector.isPlaying = () => {
	const audio = document.querySelector('[data-testid="embed.player.audio"]');

	return audio instanceof HTMLAudioElement && !audio.paused && !audio.ended;
};

Connector.getChannelId = getStationId;

Connector.getChannelLabel = () => {
	const stationId = getStationId();
	const station = stationId ? stations[stationId] : null;
	if (!station) {
		return stationId;
	}
	return station.label;
};

Connector.getOriginUrl = () => {
	const stationId = getStationId();
	return (
		(stationId && stations[stationId]?.originUrl) || window.location.href
	);
};
