import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	outputDir: './build/e2e-results',
	webServer: {
		command:
			'npx vite build --config vite.harness.config.ts && npx vite preview --config vite.harness.config.ts --port 5175 --strictPort',
		url: 'http://localhost:5175/tests/e2e/harness/index.html',
		reuseExistingServer: false,
	},
	use: {
		baseURL: 'http://localhost:5175',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
