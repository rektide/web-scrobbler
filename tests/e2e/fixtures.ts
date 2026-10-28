import { test as testBase } from '@playwright/test';
import type { AnyHandler } from 'msw';
import { defineNetworkFixture, type NetworkFixture } from '@msw/playwright';
import { handlers } from './mocks/handlers';

interface Fixtures {
	handlers: Array<AnyHandler>;
	network: NetworkFixture;
}

export const test = testBase.extend<Fixtures>({
	handlers: [handlers, { option: true }],

	network: [
		async ({ context, handlers }, use) => {
			const network = defineNetworkFixture({
				context,
				handlers,
				onUnhandledFrame: 'warn',
			});

			await network.enable();
			await use(network);
			await network.disable();
		},
		{ auto: true },
	],
});

export { expect } from '@playwright/test';
