/**
 * This script runs in non-isolated environment (MusicKit itself)
 * for accessing window variables
 *
 * Script is run as an IIFE to ensure variables are scoped, as in the event
 * of extension reload/update a new script will have to override the current one.
 *
 * Script starts by calling window.cleanup to cleanup any potential previous script.
 *
 * @returns a cleanup function that cleans up event listeners and similar for a future overriding script.
 */

import {
	every,
	runWithCleanup,
	untilReady,
} from '@/core/content/page-lifecycle';

runWithCleanup(() => {
	interface MusicKitWindow {
		MusicKit: {
			Events: {
				metadataDidChange: unknown;
				playbackStateDidChange: unknown;
				nowPlayingItemDidChange: unknown;
			};
			getInstance: () => MusicKitInstance;
		};
	}

	interface MusicKitInstance {
		player?: MusicKitInstance;
		addEventListener: (_: unknown, __: () => void) => void;
		removeEventListener: (_: unknown, __: () => void) => void;
		nowPlayingItem?: {
			albumName: string;
			title: string;
			artistName: string;
			artworkURL: string;
			container?: {
				attributes?: { [key: string]: string };
			};
			id: unknown;
		};
		currentPlaybackDuration: number;
		currentPlaybackTime: number;
		isPlaying: boolean;
	}

	// Set by the poll below once the MusicKit instance is available.
	// Event listeners only fire after it is set, but every reader still
	// guards so a cleanup before that point cannot throw.
	let instance: MusicKitInstance | null = null;

	const stopRetrying = untilReady(tryAttach, every(100));

	function tryAttach() {
		const inst = (
			window as unknown as MusicKitWindow
		).MusicKit?.getInstance?.();
		if (!inst) {
			return false;
		}

		instance = inst.player ?? inst;
		addEventListeners();
		return true;
	}

	function addEventListeners() {
		if (!instance) {
			return;
		}

		const Events = (window as unknown as MusicKitWindow).MusicKit.Events;
		instance.addEventListener(Events.metadataDidChange, sendEvent);
		instance.addEventListener(Events.playbackStateDidChange, sendEvent);
		instance.addEventListener(Events.nowPlayingItemDidChange, sendEvent);
		sendEvent();
	}

	function sendEvent() {
		if (!instance) {
			return;
		}

		window.postMessage(
			{
				sender: 'web-scrobbler',
				type: 'MUSICKIT_STATE',
				trackInfo: getTrackInfo(instance),
				isPlaying: instance.isPlaying,
			},
			'*',
		);
	}

	function getTrackInfo(inst: MusicKitInstance) {
		const item = inst.nowPlayingItem;
		return {
			album: item?.albumName,
			track: item?.title,
			artist: item?.artistName,
			albumArtist: item?.container?.attributes?.artistName,
			trackArt: getArtwork(item?.artworkURL ?? ''),
			duration: inst.currentPlaybackDuration,
			uniqueID: item?.id,
			currentTime: inst.currentPlaybackTime,
		};
	}

	function getArtwork(url: string) {
		return url.replace('{w}x{h}bb', '256x256bb');
	}

	return () => {
		stopRetrying();
		if (!instance) {
			return;
		}

		const Events = (window as unknown as MusicKitWindow).MusicKit.Events;
		instance.removeEventListener(Events.metadataDidChange, sendEvent);
		instance.removeEventListener(Events.playbackStateDidChange, sendEvent);
		instance.removeEventListener(Events.nowPlayingItemDidChange, sendEvent);
	};
});
