import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import webextensionPolyfill from '#/mocks/webextension-polyfill';
import BaseConnector from '@/core/content/connector';
import Controller from '@/core/object/controller/controller';
import Song from '@/core/object/song';
import type { Station } from '@/core/types';
import * as Util from '@/core/content/util';

vi.mock('@/util/communication', () => ({
	sendContentMessage: vi.fn().mockResolvedValue(undefined),
	setupContentListeners: vi.fn(),
	contentListener: vi.fn((listener) => listener),
}));

// Keep network metadata processing out of the station transport tests.
vi.mock('@/core/object/pipeline/pipeline', () => ({
	default: class {
		async process() {
			return false;
		}
	},
}));

const meta = {
	label: 'Test radio',
	id: 'test-radio',
	js: 'test-radio.js',
	matches: ['https://example.com/*'],
};

const station: Station = {
	uri: 'https://example.com/',
	label: 'Example Radio',
	identifiers: [
		{ authorityUri: 'https://provider.example/', value: 'radio' },
	],
};

function createConnector() {
	const connector = new BaseConnector(meta);
	connector.getArtist = () => 'Artist';
	connector.getTrack = () => 'Track';
	connector.getOriginUrl = () => 'https://example.com/listen';
	connector.isStateChangeAllowed = () => true;
	return connector;
}

describe('optional station metadata', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		webextensionPolyfill.reset();
		vi.stubGlobal('Util', Util);
		vi.stubGlobal('document', { querySelector: () => null });
	});

	afterEach(async () => {
		await vi.advanceTimersByTimeAsync(0);
		vi.clearAllTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('keeps ordinary songs and connectors compatible without a station', () => {
		const connector = createConnector();
		const callback = vi.fn();
		connector.controllerCallback = callback;
		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({ station: null }),
		);
		expect(
			new Song({ artist: 'Artist', track: 'Track' }, meta).getStation(),
		).toBeUndefined();
	});

	it('transports initial, enriched and cleared station metadata without restarting the song', () => {
		const connector = createConnector();
		const controller = new Controller(connector, true);
		let currentStation: Station | null = station;
		connector.getStation = () => currentStation;
		connector.controllerCallback = (state) =>
			controller.onStateChanged(state);

		const song = controller.getCurrentSong();
		expect(song?.getStation()).toEqual(station);
		expect(song?.getOriginUrl()).toBe('https://example.com/listen');

		currentStation = {
			...station,
			name: 'Enriched name',
			countries: ['US'],
		};
		connector.onStateChanged();
		expect(controller.getCurrentSong()).toBe(song);
		expect(song?.getStation()).toEqual(currentStation);
		expect(song?.getCloneableData().parsed.station).toEqual(currentStation);
		expect(song?.getArtist()).toBe('Artist');
		expect(song?.getTrack()).toBe('Track');

		currentStation = null;
		connector.onStateChanged();
		vi.advanceTimersByTime(500);
		expect(controller.getCurrentSong()).toBe(song);
		expect(song?.getStation()).toBeNull();
	});

	it('accepts station metadata from getTrackInfo and clears it on track changes', () => {
		const connector = createConnector();
		connector.getTrackInfo = () => ({ station });
		let song: Song | null = null;
		connector.controllerCallback = (state) => {
			song = new Song(state, meta);
		};
		expect(song!.getStation()).toEqual(station);

		connector.getTrackInfo = () => ({ track: 'Next track' });
		connector.getTrack = () => 'Next track';
		connector.onStateChanged();
		expect(song!.getStation()).toBeNull();
	});
});
