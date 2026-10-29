import { test as testBase } from '@playwright/test';
import { routePds, type RecordCall } from './mocks/pds';

export const test = testBase.extend<{ createRecordCalls: RecordCall[] }>({
	createRecordCalls: [
		async ({ context }, use) => {
			await use(await routePds(context));
		},
		{ auto: true },
	],
});

export { expect } from '@playwright/test';
