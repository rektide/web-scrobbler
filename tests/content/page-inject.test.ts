import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createPage() {
	return {
		cleanup: undefined as (() => void) | undefined,
		location: {
			href: 'https://example.com/',
			search: '?applicationName=Example&userApiUrl=https://example.com/api',
		},
		postMessage: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		setTimeout,
	};
}

let page: ReturnType<typeof createPage>;

beforeEach(() => {
	vi.useFakeTimers();
	vi.resetModules();
	page = createPage();
	vi.stubGlobal('window', page);
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('webhook approval polling', () => {
	it('installs cleanup before globals exist and confirms without DOM mutations', async () => {
		await import('@/connectors/webhook-auth-dom-inject');
		expect(page.cleanup).toBeTypeOf('function');
		expect(vi.getTimerCount()).toBe(1);

		const wsState = vi.fn().mockReturnValue('WAITING');
		const setWSState = vi.fn();
		Object.assign(page, { wsState, setWSState });
		vi.advanceTimersByTime(1000);
		expect(page.postMessage).not.toHaveBeenCalled();

		wsState.mockReturnValue('ACCEPTED');
		vi.advanceTimersByTime(1000);
		expect(page.postMessage).toHaveBeenCalledWith(
			{
				sender: 'web-scrobbler',
				type: 'confirmLogin',
				applicationName: 'Example',
				userApiUrl: 'https://example.com/api',
			},
			'*',
		);
		expect(setWSState).toHaveBeenCalledWith('CONFIRMED');
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(10000);
		expect(page.postMessage).toHaveBeenCalledTimes(1);
	});

	it('clears the poll on cleanup and does not stack polls on reinjection', async () => {
		await import('@/connectors/webhook-auth-dom-inject');
		vi.resetModules();
		await import('@/connectors/webhook-auth-dom-inject');
		expect(vi.getTimerCount()).toBe(1);
		page.cleanup?.();
		expect(vi.getTimerCount()).toBe(0);
		Object.assign(page, {
			wsState: () => 'ACCEPTED',
			setWSState: vi.fn(),
		});
		vi.advanceTimersByTime(10000);
		expect(page.postMessage).not.toHaveBeenCalled();
	});

	it('confirms immediately when approval is already available', async () => {
		Object.assign(page, {
			wsState: () => 'ACCEPTED',
			setWSState: vi.fn(),
		});
		await import('@/connectors/webhook-auth-dom-inject');
		expect(page.postMessage).toHaveBeenCalledTimes(1);
		expect(page.cleanup).toBeTypeOf('function');
		expect(vi.getTimerCount()).toBe(0);
	});
});

function createDeezer() {
	return {
		dzPlayer: {
			getCurrentSong: vi.fn().mockReturnValue(null),
			isPlaying: () => false,
		},
		Events: {
			player: { play: 'play', playing: 'playing' },
			subscribe: vi.fn(),
			unsubscribe: vi.fn(),
		},
	};
}

describe('Deezer readiness polling', () => {
	it('attaches when globals appear without DOM mutations and clears readiness polling', async () => {
		await import('@/connectors/deezer-dom-inject');
		const api = createDeezer();
		Object.assign(page, api);
		vi.advanceTimersByTime(1007);
		expect(api.Events.subscribe).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(1000);
		expect(page.postMessage).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
		page.cleanup?.();
		expect(api.Events.unsubscribe).toHaveBeenCalledTimes(2);
	});

	it('logs once and stops after the initial attempt plus six retries', async () => {
		const warn = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		await import('@/connectors/deezer-dom-inject');
		vi.advanceTimersByTime(1007 * 5);
		expect(warn).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1007);
		expect(warn).toHaveBeenCalledExactlyOnceWith(
			'web-scrobbler: Failed to initialize deezer connector!',
		);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(1007 * 20);
		expect(warn).toHaveBeenCalledTimes(1);
		const api = createDeezer();
		Object.assign(page, api);
		vi.advanceTimersByTime(1007);
		expect(api.Events.subscribe).not.toHaveBeenCalled();
	});

	it('still attaches on the sixth and final retry', async () => {
		const warn = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		await import('@/connectors/deezer-dom-inject');
		vi.advanceTimersByTime(1007 * 5);
		const api = createDeezer();
		Object.assign(page, api);
		vi.advanceTimersByTime(1007);
		expect(api.Events.subscribe).toHaveBeenCalledTimes(2);
		expect(warn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1000);
		expect(vi.getTimerCount()).toBe(0);
		page.cleanup?.();
		expect(api.Events.unsubscribe).toHaveBeenCalledTimes(2);
	});

	it('does not attach after cleanup during readiness polling', async () => {
		await import('@/connectors/deezer-dom-inject');
		page.cleanup?.();
		const api = createDeezer();
		Object.assign(page, api);
		vi.advanceTimersByTime(1007 * 10);
		expect(api.Events.subscribe).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
});

function createMusicKit() {
	const instance = {
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		currentPlaybackDuration: 0,
		currentPlaybackTime: 0,
		isPlaying: false,
	};
	return {
		instance,
		MusicKit: {
			getInstance: vi.fn().mockReturnValue(instance),
			Events: {
				metadataDidChange: 'metadata',
				playbackStateDidChange: 'playback',
				nowPlayingItemDidChange: 'item',
			},
		},
	};
}

describe('MusicKit readiness polling', () => {
	it('waits for the SDK method and attaches without DOM mutations', async () => {
		Object.assign(page, { MusicKit: {} });
		await import('@/connectors/musickit-dom-inject');
		const api = createMusicKit();
		Object.assign(page, { MusicKit: api.MusicKit });
		vi.advanceTimersByTime(100);
		expect(api.instance.addEventListener).toHaveBeenCalledTimes(3);
		expect(page.postMessage).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
		page.cleanup?.();
		expect(api.instance.removeEventListener).toHaveBeenCalledTimes(3);
	});

	it('does not attach after cleanup during readiness polling', async () => {
		await import('@/connectors/musickit-dom-inject');
		page.cleanup?.();
		const api = createMusicKit();
		Object.assign(page, { MusicKit: api.MusicKit });
		vi.advanceTimersByTime(1000);
		expect(api.instance.addEventListener).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('clears the poll when the instance is immediately available', async () => {
		const api = createMusicKit();
		Object.assign(page, { MusicKit: api.MusicKit });
		await import('@/connectors/musickit-dom-inject');
		expect(api.instance.addEventListener).toHaveBeenCalledTimes(3);
		expect(vi.getTimerCount()).toBe(0);
	});
});

function stubDocument() {
	vi.stubGlobal('document', {
		body: {},
		getElementById: vi.fn().mockReturnValue(null),
		querySelector: vi.fn().mockReturnValue(null),
	});
	const observers: PageMutationObserver[] = [];
	class PageMutationObserver {
		callback: () => void;
		observe = vi.fn();
		disconnect = vi.fn();
		constructor(callback: () => void) {
			this.callback = callback;
			observers.push(this);
		}
	}
	vi.stubGlobal('MutationObserver', PageMutationObserver);
	return observers;
}

describe('JWPlayer subscription cleanup', () => {
	it('attaches to a late SDK without DOM mutations and stops polling', async () => {
		await import('@/connectors/jwplayer-dom-inject');
		expect(vi.getTimerCount()).toBe(1);
		const player = { on: vi.fn(), off: vi.fn() };
		Object.assign(page, { jwplayer: () => player });
		vi.advanceTimersByTime(1999);
		expect(player.on).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(player.on).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(10000);
		expect(player.on).toHaveBeenCalledTimes(2);
		page.cleanup?.();
		expect(player.off).toHaveBeenCalledTimes(2);
	});

	it('waits for methods on a partially initialized player without DOM mutations', async () => {
		const player = {};
		Object.assign(page, { jwplayer: () => player });
		await import('@/connectors/jwplayer-dom-inject');
		const on = vi.fn();
		Object.assign(player, { on, off: vi.fn() });
		vi.advanceTimersByTime(2000);
		expect(on).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('allows reinjection after discovering a player without on/off methods', async () => {
		Object.assign(page, { jwplayer: () => ({}) });
		await import('@/connectors/jwplayer-dom-inject');
		expect(() => page.cleanup?.()).not.toThrow();

		const player = { on: vi.fn(), off: vi.fn() };
		Object.assign(page, { jwplayer: () => player });
		vi.resetModules();
		await import('@/connectors/jwplayer-dom-inject');
		expect(player.on).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
		page.cleanup?.();
		expect(player.off).toHaveBeenCalledWith(
			'play',
			player.on.mock.calls[0][1],
		);
		expect(player.off).toHaveBeenCalledWith(
			'pause',
			player.on.mock.calls[1][1],
		);
	});

	it('cleans up safely before the player global appears', async () => {
		await import('@/connectors/jwplayer-dom-inject');
		expect(() => page.cleanup?.()).not.toThrow();
		const player = { on: vi.fn(), off: vi.fn() };
		Object.assign(page, { jwplayer: () => player });
		vi.advanceTimersByTime(10000);
		expect(player.on).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('Telegram K controller discovery', () => {
	it('preserves mutation wake-ups even though readiness is a global condition', async () => {
		const observers = stubDocument();
		await import('@/connectors/telegram-k-dom-inject');
		const controller = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		Object.assign(page, { appMediaPlaybackController: controller });
		vi.advanceTimersByTime(10000);
		expect(controller.addEventListener).not.toHaveBeenCalled();
		observers[0].callback();
		expect(controller.addEventListener).toHaveBeenCalledTimes(2);
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		page.cleanup?.();
		expect(controller.removeEventListener).toHaveBeenCalledTimes(2);
	});

	it('does not attach from a trailing mutation after cleanup', async () => {
		const observers = stubDocument();
		await import('@/connectors/telegram-k-dom-inject');
		observers[0].callback();
		vi.advanceTimersByTime(20);
		observers[0].callback();
		page.cleanup?.();
		const controller = { addEventListener: vi.fn() };
		Object.assign(page, { appMediaPlaybackController: controller });
		vi.advanceTimersByTime(1000);
		expect(controller.addEventListener).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('Eggs subscription cleanup', () => {
	beforeEach(stubDocument);

	it('removes the listener attached on a non-artist page', async () => {
		const player = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		Object.assign(page, { player });
		await import('@/connectors/eggs-dom-inject');
		expect(player.addEventListener).toHaveBeenCalledTimes(1);
		page.cleanup?.();
		expect(player.removeEventListener).toHaveBeenCalledExactlyOnceWith(
			'onStateChange',
			player.addEventListener.mock.calls[0][1],
		);
	});

	it('does not remove a player listener that was never attached on an artist page', async () => {
		page.location.href = 'https://eggs.mu/artist/example';
		const player = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		Object.assign(page, { player });
		await import('@/connectors/eggs-dom-inject');
		page.cleanup?.();
		expect(player.addEventListener).not.toHaveBeenCalled();
		expect(player.removeEventListener).not.toHaveBeenCalled();
	});
});

describe('YouTube Music discovery interval', () => {
	it('retries at 2000 ms rather than 5000 ms', async () => {
		const observers = stubDocument();
		await import('@/connectors/youtube-music-dom-inject');
		expect(document.getElementById).toHaveBeenCalledTimes(1);
		observers[1].callback();
		expect(document.getElementById).toHaveBeenCalledTimes(2);
		observers[1].callback();
		vi.advanceTimersByTime(1999);
		expect(document.getElementById).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(1);
		expect(document.getElementById).toHaveBeenCalledTimes(3);
	});

	it('does not reattach its metadata observer from a trailing mutation after cleanup', async () => {
		const observers = stubDocument();
		await import('@/connectors/youtube-music-dom-inject');
		observers[1].callback();
		vi.advanceTimersByTime(20);
		observers[1].callback();
		page.cleanup?.();
		vi.mocked(document.getElementById).mockReturnValue({} as HTMLElement);
		vi.advanceTimersByTime(2000);
		expect(observers[0].observe).not.toHaveBeenCalled();
		expect(document.getElementById).toHaveBeenCalledTimes(2);
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		expect(observers[1].disconnect).toHaveBeenCalledTimes(1);
	});
});
