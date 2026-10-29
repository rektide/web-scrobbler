import type { Station } from '@/core/types';

const AIRKAST_URI = 'https://api.airkast.net/';

function getPlaylistToken() {
	const token = window.location.pathname.match(/^\/playlist\/([^/?#]+)/)?.[1];

	return token ? decodeURIComponent(token) : null;
}

function decodeBase64(value: string): string | null {
	try {
		return atob(
			value.replace(/-/g, '+').replace(/_/g, '/') +
				'='.repeat((4 - (value.length % 4)) % 4),
		);
	} catch {
		return null;
	}
}

/**
 * Playlist URLs carry the AirKast station ID base64-encoded twice, e.g.
 * "TlRFNE5pMHlNelE9" decodes to "5186-234". Fall back to a single
 * decoding or the raw token for deployments using another shape.
 */
function getStationId() {
	const token = getPlaylistToken();
	if (!token) {
		return null;
	}

	const outer = decodeBase64(token);
	const inner = outer ? decodeBase64(outer) : null;
	for (const candidate of [inner, outer]) {
		if (candidate && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(candidate)) {
			return candidate;
		}
	}

	return token;
}

function getStation(): Station | null {
	const token = getPlaylistToken();
	const stationId = getStationId();

	if (!token || !stationId) {
		return null;
	}

	// Playlist frames only load with a per-station signature query
	// parameter, but that is ephemeral, so identifiers keep the bare URL.
	const uri = `${AIRKAST_URI}playlist/${token}`;

	return {
		uri,
		label: stationId,
		identifiers: [
			{
				authorityUri: AIRKAST_URI,
				value: stationId,
				kind: 'station-id',
				uri,
			},
		],
	};
}

const station = getStation();

// Playlist frames render recently played entries newest first into the
// #tkp-list grid and refresh the list in place, so the first item is the
// current track. The station name is not exposed on this surface; the
// numeric station ID serves as the label.
Connector.playerSelector = '#tkp-list';

Connector.artistSelector = `${Connector.playerSelector} .tkp-item:first-child .tkp-artist`;

Connector.trackSelector = `${Connector.playerSelector} .tkp-item:first-child .tkp-song`;

Connector.trackArtSelector = `${Connector.playerSelector} .tkp-item:first-child .tkp-art`;

// Playlist frames are metadata-only: the stream plays in an <audio>
// element on the embedding page (WTMD's player page) or in the station's
// own app. Following the spinitron precedent, report playing only while
// the tab is actually audible, which covers the host page's player.
Connector.useTabAudibleApi();

Connector.getChannelId = getStationId;

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	return station?.label ?? getStationId();
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
