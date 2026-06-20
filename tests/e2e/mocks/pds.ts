import { http, HttpResponse } from 'msw';

const PDS_URL = 'https://test.pds.example.com';

export const createRecordCalls: Array<{
	collection: string;
	record: Record<string, unknown>;
}> = [];

export function resetCreateRecordCalls() {
	createRecordCalls.length = 0;
}

export const pdsHandlers = [
	http.post(`${PDS_URL}/xrpc/com.atproto.repo.createRecord`, async ({ request }) => {
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
	}),
];
