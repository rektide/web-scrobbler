import type { BrowserContext } from '@playwright/test';
import {
	testAuthorizationMetadata,
	testDidDocument,
	testResourceMetadata,
	TEST_DID,
	TEST_PDS,
} from '../../mocks/atproto-oauth';

export interface RecordCall {
	collection: string;
	record: Record<string, unknown>;
}

/** Mock external traffic only; the harness itself is always built and served locally. */
export async function routePds(context: BrowserContext): Promise<RecordCall[]> {
	const calls: RecordCall[] = [];
	await context.route('https://**/*', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		if (url.origin === 'https://cloudflare-dns.com') {
			await route.fulfill({
				json: {
					Status: 0,
					Answer: [{ type: 16, data: `"did=${TEST_DID}"` }],
				},
			});
		} else if (
			url.href === 'https://test.bsky.social/.well-known/atproto-did'
		) {
			await route.fulfill({ body: TEST_DID });
		} else if (
			url.origin === 'https://plc.directory' &&
			decodeURIComponent(url.pathname) === `/${TEST_DID}`
		) {
			await route.fulfill({ json: testDidDocument });
		} else if (
			url.href === `${TEST_PDS}/.well-known/oauth-authorization-server`
		) {
			await route.fulfill({ json: testAuthorizationMetadata });
		} else if (
			url.href === `${TEST_PDS}/.well-known/oauth-protected-resource`
		) {
			await route.fulfill({ json: testResourceMetadata });
		} else if (
			url.href === `${TEST_PDS}/oauth/revoke` &&
			request.method() === 'POST'
		) {
			await route.fulfill({ status: 200, body: '' });
		} else if (
			url.href === `${TEST_PDS}/xrpc/com.atproto.repo.createRecord` &&
			request.method() === 'POST'
		) {
			const body = request.postDataJSON() as RecordCall & {
				repo: string;
			};
			calls.push({ collection: body.collection, record: body.record });
			await route.fulfill({
				json: {
					uri: `at://${body.repo}/${body.collection}/test123`,
					cid: 'test-cid',
				},
			});
		} else {
			throw new Error(
				`Unmocked external request: ${request.method()} ${url.href}`,
			);
		}
	});
	return calls;
}
