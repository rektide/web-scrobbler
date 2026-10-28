import { resolvePath } from './scripts/util';
import './scripts/set-test-env';
import ConditionalCompile from 'vite-plugin-conditional-compiler';
import { configDefaults } from 'vitest/config';
export default {
	resolve: {
		alias: {
			'@': resolvePath(__dirname, './src'),
			'#': resolvePath(__dirname, './tests'),
		},
	},
	plugins: [ConditionalCompile()],
	test: {
		exclude: [...configDefaults.exclude, 'tests/e2e/**'],
		testTimeout: 10000,
		setupFiles: ['./tests/setup/handle-rejections.ts'],
		coverage: {
			provider: 'istanbul',
			reporter: ['lcovonly', 'text-summary'],
			all: false,
			include: ['src/**'],
		},
	},
};
