import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createPage() {
	return {
		cleanup: undefined as (() => void) | undefined,
		location: {
			href: 'https://example.com/',
			search: '?applicationName=Example&userApiUrl=https://example.com/api',
		},
		postMessage: vi.fn(),
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
