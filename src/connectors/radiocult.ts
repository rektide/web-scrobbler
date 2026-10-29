export {};

Connector.playerSelector = '#__next';
Connector.trackSelector = '[data-testid="live-now.title"]';
Connector.artistSelector = '[data-testid="live-now.artist"]';
Connector.trackArtSelector = 'img[alt="Now playing artwork"]';

Connector.isPlaying = () => {
	const audio = document.querySelector('[data-testid="embed.player.audio"]');
	return audio instanceof HTMLAudioElement && !audio.paused && !audio.ended;
};
