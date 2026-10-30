type AttributeAudio = {
	title?: string;
	performer?: string;
};

type AttributeFilename = {
	file_name: string;
};

type Attribute = AttributeAudio | AttributeFilename;

interface Document {
	id: string;
	duration: number;
	type: 'audio' | 'round' | 'voice';
	attributes: Attribute[];
}

interface Details {
	doc: Document;
	media: HTMLAudioElement | HTMLVideoElement;
}

interface MediaController {
	getPlayingDetails: () => Details;
	addEventListener: (_: string, __: () => void) => void;
	removeEventListener: (_: string, __: () => void) => void;
}

interface Window {
	appMediaPlaybackController: MediaController;
}

import {
	onMutations,
	runWithCleanup,
	untilReady,
} from '@/core/content/page-lifecycle';

runWithCleanup(() => {
	const W = window as unknown as Window;
	let attached = false;

	function extractAttributes(attributes: Attribute[]) {
		const data: { [key: string]: string | undefined } = {};
		for (const attribute of attributes) {
			for (const key in attribute) {
				data[key] = attribute[key as keyof Attribute];
			}
		}
		return data;
	}

	function listener() {
		const details = W.appMediaPlaybackController.getPlayingDetails();
		const attribute = extractAttributes(details.doc.attributes);
		const { file_name: fileName } = attribute;
		window.postMessage(
			{
				sender: 'web-scrobbler',
				type: 'TELEGRAM_K_STATE',
				state: {
					_track: attribute.title || fileName,
					_artist: attribute.performer || fileName,
					getUniqueID: details.doc.id,
					getDuration: details.doc.duration,
					isPlaying: details.media.paused === false,
					isStateChangeAllowed: details.doc.type === 'audio',
				},
			},
			'*',
		);
	}

	function toggleEventListeners(name: string) {
		const api = W.appMediaPlaybackController;
		const method = `${name}EventListener` as keyof MediaController;
		const events = ['play', 'pause'];
		for (const event of events) {
			api[method](event, listener);
		}
	}

	// Preserve mutation-driven wake-ups, though readiness is a controller global:
	// assignment alone does not guarantee another attempt without a DOM mutation.
	const stopRetrying = untilReady(
		function tryAttach() {
			if (!('appMediaPlaybackController' in W)) {
				return false;
			}

			toggleEventListeners('add');
			attached = true;
			return true;
		},
		onMutations(document.body, 1000),
	);

	return () => {
		stopRetrying();
		if (attached) {
			toggleEventListeners('remove');
		}
	};
});
