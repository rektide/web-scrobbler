import { test, expect } from './fixtures';
import { TEST_DID } from '../mocks/atproto-oauth';

const HARNESS_URL = '/tests/e2e/harness/index.html';

test('account updates without a focus/auth-started marker and survives page recreation', async ({
	page,
}) => {
	await page.goto(HARNESS_URL);
	await page.waitForFunction(() => window.ready);
	await expect(page.getByText('You are not signed in.')).toBeVisible();
	await page.evaluate(async () => {
		await window.seedSession();
	});
	await expect(
		page.getByText(`You are signed in as ${TEST_DID}.`),
	).toBeVisible();
	await page.reload();
	await page.waitForFunction(() => window.ready);
	await expect(
		page.getByText(`You are signed in as ${TEST_DID}.`),
	).toBeVisible();
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page.getByText('You are not signed in.')).toBeVisible();
	await page.reload();
	await page.waitForFunction(() => window.ready);
	await expect(page.getByText('You are not signed in.')).toBeVisible();
});

test('old browser sessions require reauthorization without losing preferences or data', async ({
	page,
}) => {
	await page.goto(HARNESS_URL);
	await page.waitForFunction(() => window.ready);
	const old = {
		sessionID: TEST_DID,
		oauthSession: { info: { sub: TEST_DID }, token: { access: 'old' } },
		lexicons: { teal: false, rocksky: true },
	};
	await page.evaluate(async (legacy) => {
		await window.browser.storage.local.set({
			AtProto: legacy,
			unrelated: { preserved: true },
		});
	}, old);
	await expect(
		page.getByText(
			/previous AT Protocol session needs a new authorization/,
		),
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
	expect(
		await page.evaluate(() => window.browser.storage.local.get('AtProto')),
	).toEqual({ AtProto: old });
	await page.evaluate(async () => {
		await window.seedSession();
	});
	await expect(page.getByLabel('teal.fm', { exact: true })).not.toBeChecked();
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page.getByText('You are not signed in.')).toBeVisible();
	expect(
		await page.evaluate(() =>
			window.browser.storage.local.get(['AtProto', 'unrelated']),
		),
	).toEqual({
		AtProto: { lexicons: old.lexicons },
		unrelated: { preserved: true },
	});
});
