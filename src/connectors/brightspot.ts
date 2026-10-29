import type { Station } from '@/core/types';

/**
 * Stations whose sites run Brightspot's persistent live-stream player. The
 * player markup is shared CMS output, so additional Brightspot stations only
 * need an entry here plus a match pattern in connectors.ts.
 */
const STATION_SITES: Record<string, { label: string; callSign?: string }> = {
	'ksjd.org': { label: 'KSJD', callSign: 'KSJD' },
	'mainepublic.org': { label: 'Maine Public' },
};

function getSiteDomain() {
	const { host } = window.location;
	for (const domain of Object.keys(STATION_SITES)) {
		if (host === domain || host.endsWith(`.${domain}`)) {
			return domain;
		}
	}

	return null;
}

/**
 * Return the name of the stream that is playing, if any, else of the first
 * stream offered. Maine Public runs several streams ("Maine Public",
 * "Maine Public Classical") in one player, so the org label alone is not
 * always the station the user is hearing.
 */
function getStreamName() {
	const stream =
		document.querySelector('ps-stream[state="playing"]') ??
		document.querySelector('ps-stream[data-stream-name]');

	return stream?.getAttribute('data-stream-name') ?? null;
}

function getStation(): Station | null {
	const domain = getSiteDomain();
	if (!domain) {
		return null;
	}

	const uri = `https://${domain}/`;
	const { label: orgLabel, callSign } = STATION_SITES[domain];

	return {
		uri,
		label: getStreamName() ?? orgLabel,
		...(callSign ? { callSign } : {}),
		identifiers: [
			{
				authorityUri: uri,
				value: domain,
				kind: 'slug',
				uri,
			},
		],
	};
}

Connector.playerSelector = '.BrightspotPersistentPlayer';

// The player polls a Cadence now-playing API per stream and writes the result
// into the data-* spans below; those attributes are its stable output
// contract, unlike the surrounding CSS classes. Song details are only filled
// in for music streams; otherwise the bar falls back to the program name.
Connector.trackSelector = ['[data-songinfo-song]', '[data-primary-info]'];

Connector.albumSelector = '[data-songinfo-album]';

Connector.trackArtSelector = [
	'[data-songinfo-image] img',
	'[data-drawer-image] img',
];

Connector.getArtist = () => {
	const artistEl = document.querySelector('[data-songinfo-artist]');
	// The player renders "Artist - " beside a separate album or composer
	// span, so strip the trailing separator it composes.
	const artist = artistEl?.textContent?.replace(/\s+-\s*$/, '').trim();

	return artist || null;
};

Connector.isPlaying = () => {
	// Howler drives the stream through Audio objects it never attaches to
	// the DOM; each ps-stream element instead mirrors its playback state in
	// a `state` attribute ("playing", "paused", "stopped").
	return document.querySelector('ps-stream[state="playing"]') !== null;
};

Connector.getChannelId = getStreamName;

Connector.getStation = getStation;

Connector.getChannelLabel = () => {
	return getStreamName() ?? STATION_SITES[getSiteDomain() ?? '']?.label;
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
