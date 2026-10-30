/**
 * This script runs in non-isolated environment(youtube music itself)
 * for accessing navigator variables on Firefox
 *
 * * Script is run as an IIFE to ensure variables are scoped, as in the event
 * of extension reload/update a new script will have to override the current one.
 *
 * Script starts by calling window.cleanup to cleanup any potential previous script.
 *
 * @returns a cleanup function that cleans up event listeners and similar for a future overriding script.
 */

import {
	onMutations,
	runWithCleanup,
	untilReady,
} from '@/core/content/page-lifecycle';

runWithCleanup(() => {
	const sendData = () => {
		window.postMessage(
			{
				sender: 'web-scrobbler',
				playbackState: navigator.mediaSession.playbackState,
				metadata: {
					title: navigator.mediaSession.metadata?.title,
					artist: navigator.mediaSession.metadata?.artist,
					artwork: navigator.mediaSession.metadata?.artwork,
					album: navigator.mediaSession.metadata?.album,
				},
			},
			'*',
		);
	};
	const observer = new MutationObserver(sendData);

	// The play/pause button keeps its ID across UI redesigns; the
	// redesigned player exposes track info as 'ytmusic-track-info'.
	// Observe whichever player elements exist; send once both do.
	// Returns whether all elements were found.
	const tryAttach = () => {
		const playPauseButton = document.getElementById('play-pause-button');
		const songInfo = document.querySelector(
			'.content-info-wrapper, ytmusic-track-info',
		);

		if (playPauseButton !== null) {
			observer.observe(playPauseButton, {
				attributes: true,
			});
		}

		if (songInfo !== null) {
			observer.observe(songInfo, {
				attributes: true,
				subtree: true,
			});
		}

		if (playPauseButton !== null && songInfo !== null) {
			sendData();
		}

		return playPauseButton !== null && songInfo !== null;
	};

	// This script only runs on YouTube Music, so the player is expected
	// eventually, but the redesigned player can render after page load.
	const stopRetrying = untilReady(
		tryAttach,
		onMutations(document.body, 2000),
	);

	return () => {
		// remove the subscribers added by this extension from the array.
		// we dont have a confirmed reference to it so we have to check all of them.
		observer.disconnect();
		stopRetrying();
	};
});
