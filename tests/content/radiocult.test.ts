import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '#/mocks/webextension-polyfill';
import BaseConnector from '@/core/content/connector';
import connectors from '@/core/connectors';
import * as UrlMatch from '@/util/url-match';

const meta = connectors.find((connector) => connector.id === 'radiocult')!;

class AudioElement {
	paused = false;
	ended = false;
}

describe('RadioCult connector', () => {
	let connector: BaseConnector;
	let audio: AudioElement | null;
	let location: URL;

	beforeEach(() => {
		vi.resetModules();
		vi.useFakeTimers();
		connector = new BaseConnector(meta);
		audio = new AudioElement();
		location = new URL('https://app.radiocult.fm/embed/player/example');
		const elements: Record<string, unknown[]> = {
			'[data-testid="live-now.title"]': [{ innerText: 'Track' }],
			'[data-testid="live-now.artist"]': [{ innerText: 'Artist' }],
			'img[alt="Now playing artwork"]': [
				{ getAttribute: () => 'https://example.com/art.jpg' },
			],
		};
		vi.stubGlobal('Connector', connector);
		vi.stubGlobal('window', { location });
		vi.stubGlobal('document', {
			querySelector: () => audio,
			querySelectorAll: (selector: string) => elements[selector] ?? [],
		});
		vi.stubGlobal('HTMLAudioElement', AudioElement);
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it.each(['dock', 'player', 'popout', 'square-player'])(
		'supports the %s player and track metadata',
		async (variant) => {
			location.pathname = `/embed/${variant}/example`;
			expect(meta.allFrames).toBe(true);
			expect(meta.usesBlocklist).toBe(true);
			expect(
				meta.matches.some((pattern) =>
					UrlMatch.test(location.href, pattern),
				),
			).toBe(true);
			await import('@/connectors/radiocult');
			expect(connector.playerSelector).toBe('#__next');
			expect(connector.getArtist()).toBe('Artist');
			expect(connector.getTrack()).toBe('Track');
			expect(connector.getTrackArt()).toBe('https://example.com/art.jpg');
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
});
