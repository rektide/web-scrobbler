import { beforeEach, describe, expect, it, vi } from 'vitest';
import webextensionPolyfill from '#/mocks/webextension-polyfill';
import browser from 'webextension-polyfill';
import * as ContentUtil from '@/core/content/util';

describe('connector-specific options', () => {
	beforeEach(() => {
		vi.resetModules();
		webextensionPolyfill.reset();
	});

	it('initializes the RadioCult default without changing existing YouTube preferences', async () => {
		await browser.storage.sync.set({
			Connectors: { YouTube: { scrobbleMusicOnly: false } },
		});
		const options = await import('@/core/storage/options');
		expect(
			await options.getConnectorOption(
				'RadioCult',
				'stripTrademarkSymbols',
			),
		).toBe(true);
		expect(
			await options.getConnectorOption('YouTube', 'scrobbleMusicOnly'),
		).toBe(false);
		expect(
			await options.getConnectorOption(
				'YouTube',
				'enableGetTrackInfoFromYtMusic',
			),
		).toBe(true);
		expect(
			await options.getConnectorOption(
				'YouTube',
				'scrobbleEntertainmentOnly',
			),
		).toBe(false);
	});

	it('preserves false preferences through initialization and persists each connector independently', async () => {
		await browser.storage.sync.set({
			Connectors: {
				RadioCult: { stripTrademarkSymbols: false },
				YouTube: { scrobbleMusicOnly: false },
			},
		});
		const options = await import('@/core/storage/options');
		expect(
			await ContentUtil.getOption(
				'RadioCult',
				'stripTrademarkSymbols',
				true,
			),
		).toBe(false);
		await options.setConnectorOption(
			'RadioCult',
			'stripTrademarkSymbols',
			true,
		);
		expect(
			await ContentUtil.getOption(
				'RadioCult',
				'stripTrademarkSymbols',
				true,
			),
		).toBe(true);
		await options.setConnectorOption('YouTube', 'scrobbleMusicOnly', true);
		expect(
			await ContentUtil.getOption('YouTube', 'scrobbleMusicOnly'),
		).toBe(true);
		await options.setConnectorOption(
			'RadioCult',
			'stripTrademarkSymbols',
			false,
		);
		expect(
			await options.getConnectorOption(
				'RadioCult',
				'stripTrademarkSymbols',
			),
		).toBe(false);
		expect(
			await options.getConnectorOption('YouTube', 'scrobbleMusicOnly'),
		).toBe(true);
	});

	it('rejects options belonging to another connector', async () => {
		const options = await import('@/core/storage/options');
		await expect(
			options.getConnectorOption('RadioCult', 'scrobbleMusicOnly'),
		).rejects.toThrow('Unknown connector option key');
		await expect(
			options.setConnectorOption(
				'YouTube',
				'stripTrademarkSymbols',
				false,
			),
		).rejects.toThrow('Unknown connector option key');
	});

	it('keeps the legacy missing-option default while allowing an explicit fallback', async () => {
		expect(
			await ContentUtil.getOption('YouTube', 'scrobbleMusicOnly'),
		).toBe(false);
		expect(
			await ContentUtil.getOption(
				'RadioCult',
				'stripTrademarkSymbols',
				true,
			),
		).toBe(true);
	});
});
