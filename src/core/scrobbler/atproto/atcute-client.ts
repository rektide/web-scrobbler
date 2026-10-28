import type { OAuthSession } from '@atcute/oauth-node-client';
import { requestOAuthLock } from './oauth-client';

export class AtProtoRequestError extends Error {
	constructor(public status: number) {
		super(`createRecord failed: ${status}`);
	}
}

export class AtProtoClient {
	public agent: OAuthSession;
	public readonly did: string;

	constructor(session: OAuthSession) {
		this.agent = session;
		this.did = session.did;
	}

	async createRecord(
		collection: string,
		record: Record<string, unknown>,
	): Promise<{ uri: string; cid: string }> {
		const response = await requestOAuthLock('lifecycle', () =>
			this.agent.handle('/xrpc/com.atproto.repo.createRecord', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repo: this.did,
					collection,
					record,
				}),
			}),
		);
		if (!response.ok) {
			throw new AtProtoRequestError(response.status);
		}
		return (await response.json()) as { uri: string; cid: string };
	}
}

export function createAtProtoClient(session: OAuthSession): AtProtoClient {
	return new AtProtoClient(session);
}
