import { defineConfig } from 'vite';
import { resolve } from 'path';
import ConditionalCompile from 'vite-plugin-conditional-compiler';
import solid from 'vite-plugin-solid';

export default defineConfig({
	resolve: {
		alias: [
			{ find: '@', replacement: '/src' },
			{ find: '#', replacement: '/tests' },
			{
				find: 'webextension-polyfill',
				replacement: resolve(
					__dirname,
					'tests/e2e/harness/browser-shim.ts',
				),
			},
		],
	},
	define: {
		VITE_DEV: JSON.stringify('true'),
		VITE_CHROME: JSON.stringify('true'),
		// Match the browser-shim sender.url mock (rektide.github.io).
		'import.meta.env.VITE_ATPROTO_OAUTH_ORIGIN': JSON.stringify(
			process.env.VITE_ATPROTO_OAUTH_ORIGIN ??
				'https://rektide.github.io',
		),
	},
	plugins: [ConditionalCompile(), solid()],
	build: {
		outDir: resolve(__dirname, 'build/e2e-harness'),
		emptyOutDir: true,
		rollupOptions: {
			input: resolve(__dirname, 'tests/e2e/harness/index.html'),
		},
	},
});
