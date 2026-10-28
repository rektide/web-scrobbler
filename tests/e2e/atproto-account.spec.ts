import { test, expect } from './fixtures';
import { TEST_DID } from '../mocks/atproto-oauth';
import { http, HttpResponse } from 'msw';

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

test('an expired revoked grant reports auth failure and updates readiness instead of throwing', async ({
	page,
	network,
}) => {
	network.use(
		http.post('https://test.pds.example.com/oauth/token', () =>
			HttpResponse.json({ error: 'invalid_grant' }, { status: 400 }),
		),
	);
	await page.goto(HARNESS_URL);
	await page.waitForFunction(() => window.ready);
	const result = await page.evaluate(async () => {
		window.testSession.tokenSet.expires_at = 0;
		await window.seedSession();
		const song = new window.Song(
			{ track: 'Test', artist: 'Test' },
			{
				label: 'KEXP',
				id: 'kexp',
				js: 'kexp.js',
				matches: ['https://kexp.org/*'],
			},
		);
		return window.atproto.scrobble([song], false);
	});
	expect(result).toEqual(['error-auth']);
	await expect(page.getByText('You are not signed in.')).toBeVisible();
});

test('expired tokens rotate durably and record writes use the rotation after page recreation', async ({
	page,
	network,
}) => {
	let refreshes = 0;
	const authorizations: string[] = [];
	network.use(
		http.post(
			'https://test.pds.example.com/oauth/token',
			async ({ request }) => {
				expect(
					new URLSearchParams(await request.text()).get(
						'refresh_token',
					),
				).toBe('test-refresh-token');
				refreshes++;
				return HttpResponse.json({
					sub: TEST_DID,
					access_token: 'rotated-access',
					refresh_token: 'rotated-refresh',
					token_type: 'DPoP',
					scope: 'atproto',
					expires_in: 3600,
				});
			},
		),
		http.post(
			'https://test.pds.example.com/xrpc/com.atproto.repo.createRecord',
			({ request }) => {
				authorizations.push(request.headers.get('Authorization') ?? '');
				return HttpResponse.json({
					uri: 'at://test/record',
					cid: 'test-cid',
				});
			},
		),
	);
	await page.goto(HARNESS_URL);
	await page.waitForFunction(() => window.ready);
	await page.evaluate(async () => {
		window.testSession.tokenSet.expires_at = 0;
		await window.seedSession();
	});
	const scrobble = () =>
		page.evaluate(async () => {
			const song = new window.Song(
				{ track: 'Test', artist: 'Test' },
				{
					label: 'KEXP',
					id: 'kexp',
					js: 'kexp.js',
					matches: ['https://kexp.org/*'],
				},
			);
			return window.atproto.scrobble([song], false);
		});
	expect(await scrobble()).toEqual(['ok']);
	await page.reload();
	await page.waitForFunction(() => window.ready);
	expect(await scrobble()).toEqual(['ok']);
	expect(refreshes).toBe(1);
	expect(authorizations).toEqual(new Array(4).fill('DPoP rotated-access'));
	const stored = await page.evaluate(() =>
		window.browser.storage.local.get(null),
	);
	expect(Object.values(stored)).toContainEqual(
		expect.objectContaining({
			tokenSet: expect.objectContaining({
				refresh_token: 'rotated-refresh',
			}),
		}),
	);
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
