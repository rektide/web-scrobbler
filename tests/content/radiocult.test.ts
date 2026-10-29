import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '#/mocks/webextension-polyfill';
import BaseConnector from '@/core/content/connector';
import connectors from '@/core/connectors';
import * as Util from '@/core/content/util';
import * as UrlMatch from '@/util/url-match';

const meta = connectors.find((connector) => connector.id === 'radiocult')!;

class AudioElement {
	paused = false;
	ended = false;
}

const response = {
	station: {
		id: 'mountain-chill',
		name: 'Mountain Chill® - KRKQ 95.5 FM',
		channels: [{ name: 'Mountain Chill®' }],
	},
};

describe('RadioCult connector', () => {
	let connector: BaseConnector;
	let audio: AudioElement | null;
	let page: { title: string; referrer: string };
	let location: URL;
	let fetchStation: ReturnType<typeof vi.fn>;
	let debugLog: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetModules();
		vi.useFakeTimers();
		connector = new BaseConnector(meta);
		connector.onStateChanged = vi.fn();
		audio = new AudioElement();
		location = new URL(
			'https://app.radiocult.fm/embed/player/mountain-chill',
		);
		page = {
			title: 'Mountain Chill® - KRKQ 95.5 FM | RadioCult',
			referrer: 'https://station.example/listen',
		};
		const elements: Record<string, unknown[]> = {
			'[data-testid="live-now.title"]': [{ innerText: 'Track' }],
			'[data-testid="live-now.artist"]': [{ innerText: 'Artist' }],
			'img[alt="Now playing artwork"]': [
				{ getAttribute: () => 'https://station.example/art.jpg' },
			],
		};
		vi.stubGlobal('Connector', connector);
		debugLog = vi.fn();
		vi.stubGlobal('Util', { ...Util, debugLog });
		vi.stubGlobal('window', { location });
		vi.stubGlobal('document', {
			get title() {
				return page.title;
			},
			get referrer() {
				return page.referrer;
			},
			querySelector: () => audio,
			querySelectorAll: (selector: string) => elements[selector] ?? [],
		});
		vi.stubGlobal('HTMLAudioElement', AudioElement);
		fetchStation = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => response,
		});
		vi.stubGlobal('fetch', fetchStation);
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it.each(['dock', 'player', 'popout', 'square-player'])(
		'supports the %s player, track metadata, station identity and blocklisting',
		async (variant) => {
			location.pathname = `/embed/${variant}/mountain-chill`;
			expect(meta.allFrames).toBe(true);
			expect(meta.usesBlocklist).toBe(true);
			expect(
				meta.matches.some((pattern) =>
					UrlMatch.test(location.href, pattern),
				),
			).toBe(true);
			await import('@/connectors/radiocult');
			await vi.advanceTimersByTimeAsync(0);
			expect(connector.playerSelector).toBe('#__next');
			expect(connector.getArtist()).toBe('Artist');
			expect(connector.getTrack()).toBe('Track');
			expect(connector.getTrackArt()).toBe(
				'https://station.example/art.jpg',
			);
			expect(connector.getChannelInfo()).toEqual({
				id: 'mountain-chill',
				label: 'Mountain Chill - KRKQ 95.5 FM',
			});
			expect(connector.getStation()).toMatchObject({
				name: 'Mountain Chill',
				callSign: 'KRKQ',
				frequencyHz: 95_500_000,
				tagline: 'Ninety-five five Mountain Chill',
			});
			expect(connector.onStateChanged).toHaveBeenCalled();
		},
	);

	it('tracks playing, paused, ended and missing audio', async () => {
		await import('@/connectors/radiocult');
		expect(connector.isPlaying()).toBe(true);
		audio!.paused = true;
		expect(connector.isPlaying()).toBe(false);
		audio!.paused = false;
		audio!.ended = true;
		expect(connector.isPlaying()).toBe(false);
		audio = null;
		expect(connector.isPlaying()).toBe(false);
	});

	it('prefers the top-level listening URL over the embed referrer and URL', async () => {
		await import('@/connectors/radiocult');
		connector.topLevelUrl = 'https://station.example/listen?show=night';
		expect(connector.getOriginUrl()).toBe(connector.topLevelUrl);
		connector.topLevelUrl = null;
		expect(connector.getOriginUrl()).toBe(page.referrer);
		page.referrer = '';
		expect(connector.getOriginUrl()).toBe(location.href);
	});

	it.each(['network', 'HTTP', 'JSON'])(
		'keeps fallback identity and playback after a %s failure',
		async (failure) => {
			if (failure === 'network') {
				fetchStation.mockRejectedValue(new Error('Network failed'));
			} else {
				fetchStation.mockResolvedValue({
					ok: failure !== 'HTTP',
					status: 503,
					json: async () => {
						throw new Error('Invalid JSON');
					},
				});
			}
			await import('@/connectors/radiocult');
			await vi.advanceTimersByTimeAsync(0);
			expect(connector.getStation()).toMatchObject({
				label: 'Mountain Chill - KRKQ 95.5 FM',
				uri: 'https://app.radiocult.fm/embed/square-player/mountain-chill',
			});
			expect(connector.isPlaying()).toBe(true);
			expect(debugLog).toHaveBeenCalledWith(
				expect.stringContaining(
					'Unable to load RadioCult station metadata:',
				),
				'warn',
			);
		},
	);

	it('decodes legacy station IDs and encodes API requests', async () => {
		location.pathname = '/embed/player/20ft%20Radio';
		await import('@/connectors/radiocult');
		expect(connector.getChannelId?.()).toBe('20ft Radio');
		expect(fetchStation).toHaveBeenCalledWith(
			'https://api.radiocult.fm/api/station/20ft%20Radio',
		);
	});
});
