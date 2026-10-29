import type { Station } from '@/core/types';

const WETA_URI = 'https://weta.org/';

const station: Station = {
	uri: WETA_URI,
	label: 'WETA',
	callSign: 'WETA',
	identifiers: [
		{
			authorityUri: WETA_URI,
			value: 'weta.org',
			kind: 'slug',
			uri: WETA_URI,
		},
	],
};

// weta.org/player mounts three StreamGuys live channels (WETA Classical,
// VivaLaVoce, Virtuoso) as static <audio> elements. A MediaElement.js skin
// with the `weta-player-mejs__` class prefix wraps each stream in its own
// container and renders a per-channel "Now Streaming" tracklist inside it,
// refreshed from the station's own playlist API. Every channel keeps its
// own tracklist, so artist and track must be read through the playing
// stream's container rather than by document-wide selectors.
Connector.playerSelector = '.weta-player-wrapper';

function getPlayingStream(): HTMLAudioElement | null {
	for (const stream of document.querySelectorAll('audio.weta-player__stream')) {
		if (stream instanceof HTMLAudioElement && !stream.paused && !stream.ended) {
			return stream;
		}
	}

	return null;
}

function getPlayingTracklist(): HTMLElement | null {
	return (
		getPlayingStream()
			?.closest('.weta-player-mejs__container')
			?.querySelector('.weta-player-mejs__tracklist') ?? null
	);
}

Connector.getArtist = () => {
	// Classical channels show the composer here (e.g. "Antonín Dvořák");
	// the player exposes no performer field in the DOM.
	const composer = getPlayingTracklist()?.querySelector(
		'h4.weta-player-mejs__tracklist__title',
	);

	return composer?.textContent?.trim() || null;
};

Connector.getTrack = () => {
	// The work and movement (e.g. "Cello Concerto in B Minor, Op. 104:
	// I. Allegro"); news items carry only the program name here.
	const work = getPlayingTracklist()?.querySelector(
		'p.weta-player-mejs__tracklist__description',
	);

	return work?.textContent?.trim() || null;
};

Connector.isPlaying = () => {
	if (getPlayingStream() !== null) {
		return true;
	}

	// The skin's wetaplayerui feature mirrors the media state on the
	// progress rail: weta-player-mejs__playing while the stream runs.
	const rail = document.querySelector('.weta-player-mejs__time-rail');

	return rail?.classList.contains('weta-player-mejs__playing') ?? null;
};

Connector.getChannelId = () => {
	// WETA (Classical), VLV (VivaLaVoce) or VIR (Virtuoso).
	return getPlayingStream()?.dataset.channel ?? null;
};

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	return getPlayingStream()?.dataset.channelName ?? null;
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
