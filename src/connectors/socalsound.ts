import type { Station } from '@/core/types';

const SOCALSOUND_URI = 'https://www.thesocalsound.org/';

const station: Station = {
	uri: SOCALSOUND_URI,
	label: 'The SoCal Sound',
	callSign: 'KCSN',
	identifiers: [
		{
			authorityUri: SOCALSOUND_URI,
			value: 'thesocalsound.org',
			kind: 'slug',
			uri: SOCALSOUND_URI,
		},
	],
};

// The whole-domain match is guarded by the player selector below: only
// /live contains #mainPanel, so the connector stays dormant on the rest
// of the site (playlist, donate, article pages).
Connector.playerSelector = '#mainPanel';

// listen.js (SoundManager2 player) polls /ajax/Program/PlayerCurrentSongInfo
// every 20 seconds and writes separate artist/title fields — no "Track |
// Album" split is needed, unlike the playlist page's div.pl-song rows.
Connector.artistSelector = '#currentSong';

Connector.trackSelector = '#currentTitle';

// listen.js fills #coverHolder with the station logo on play and replaces
// it with the polled Apple Music artwork on the next song-info refresh.
Connector.trackArtSelector = '#coverHolder img';

// The stream mounts only on play; listen.js shows #stopBtn (inside
// #mainPanel) while the SoundManager2 stream runs and hides it on stop.
Connector.pauseButtonSelector = '#stopBtn';

Connector.getChannelId = () => {
	return 'thesocalsound.org';
};

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	return station.label;
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
