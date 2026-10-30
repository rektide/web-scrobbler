import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Plugin } from 'vite';
import { exec } from 'child_process';
import chokidar from 'chokidar';
import compileConnectors from '../../scripts/compile-connectors';

const { watcher } = vi.hoisted(() => ({
	watcher: { on: vi.fn().mockReturnThis(), close: vi.fn() },
}));

vi.mock('child_process', () => ({
	exec: vi.fn((_command, callback) => callback(null, '', '')),
}));
vi.mock('fs-extra', () => ({
	default: {
		ensureDirSync: vi.fn(),
		removeSync: vi.fn(),
		moveSync: vi.fn(),
	},
}));
vi.mock('chokidar', () => ({
	default: { watch: vi.fn(() => watcher) },
}));
vi.mock('../../scripts/log', () => ({ default: vi.fn() }));
vi.mock('../../scripts/util', () => ({ getBrowser: () => 'chrome' }));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('connector development watch paths', () => {
	it('watches connector and shared core directories and rebuilds on a helper edit', async () => {
		const paths = ['src/connectors/', 'src/core/content/'];
		const plugin = compileConnectors({
			watchDirectory: paths,
			isDev: true,
		}) as Plugin;
		const buildStart = plugin.buildStart as () => Promise<void>;
		await buildStart();
		expect(chokidar.watch).toHaveBeenCalledWith(paths, {
			ignoreInitial: true,
		});
		const change = watcher.on.mock.calls.find(
			([event]) => event === 'change',
		)?.[1] as (path: string) => void;
		change('src/core/content/page-lifecycle.ts');
		expect(exec).toHaveBeenCalledTimes(2);
		expect(exec).toHaveBeenLastCalledWith(
			'esbuild src/connectors/*.ts --bundle --outdir=build/connectorraw --tsconfig=tsconfig.connectors.json',
			expect.any(Function),
		);
	});

	it('does not start a watcher for production builds', async () => {
		const plugin = compileConnectors({
			watchDirectory: ['src/connectors/', 'src/core/content/'],
			isDev: false,
		}) as Plugin;
		const buildStart = plugin.buildStart as () => Promise<void>;
		await buildStart();
		expect(chokidar.watch).not.toHaveBeenCalled();
		expect(exec).toHaveBeenCalledTimes(1);
	});
});
