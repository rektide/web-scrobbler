import { http, HttpResponse } from 'msw';
import {
	testAuthorizationMetadata,
	testDidDocument,
	testResourceMetadata,
	TEST_DID,
} from '../../mocks/atproto-oauth';

const PDS_URL = 'https://test.pds.example.com';

export const createRecordCalls: Array<{
	collection: string;
	record: Record<string, unknown>;
}> = [];

export function resetCreateRecordCalls() {
	createRecordCalls.length = 0;
}

export const pdsHandlers = [
	http.get('https://cloudflare-dns.com/dns-query', () =>
		HttpResponse.json({
			Status: 0,
			Answer: [{ type: 16, data: `"did=${TEST_DID}"` }],
		}),
	),
	http.get('https://test.bsky.social/.well-known/atproto-did', () =>
		HttpResponse.text(TEST_DID),
	),
	http.get(`${PDS_URL}/.well-known/oauth-authorization-server`, () =>
		HttpResponse.json(testAuthorizationMetadata),
	),
	http.get(`${PDS_URL}/.well-known/oauth-protected-resource`, () =>
		HttpResponse.json(testResourceMetadata),
	),
	http.get(`https://plc.directory/${encodeURIComponent(TEST_DID)}`, () =>
		HttpResponse.json(testDidDocument),
	),
	http.post(
		`${PDS_URL}/oauth/revoke`,
		() => new HttpResponse(null, { status: 200 }),
	),
	http.post(
		`${PDS_URL}/xrpc/com.atproto.repo.createRecord`,
		async ({ request }) => {
			const body = (await request.json()) as {
				repo: string;
				collection: string;
				record: Record<string, unknown>;
			};

			createRecordCalls.push({
				collection: body.collection,
				record: body.record,
			});

			return HttpResponse.json({
				uri: `at://${body.repo}/${body.collection}/tiktoktest123`,
				cid: 'bafytestcid123',
				commit: {
					cid: 'bafytestcommit',
					rev: 'test-rev',
				},
				validationStatus: 'valid',
			});
		},
	),
];
