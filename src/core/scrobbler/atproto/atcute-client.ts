import { OAuthUserAgent, type Session } from '@atcute/oauth-browser-client';

export class AtProtoClient {
	private agent: OAuthUserAgent;
	public readonly did: string;

	constructor(session: Session) {
		this.agent = new OAuthUserAgent(session);
		this.did = session.info.sub;
	}

	async createRecord(
		collection: string,
		record: Record<string, unknown>,
	): Promise<{ uri: string; cid: string }> {
		const response = await this.agent.handle(
			`/xrpc/com.atproto.repo.createRecord`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repo: this.did,
					collection,
					record,
				}),
			},
		);
		if (!response.ok) {
			throw new Error(`createRecord failed: ${response.status} ${await response.text()}`);
		}
		return (await response.json()) as { uri: string; cid: string };
	}
}

export function createAtProtoClient(session: Session): AtProtoClient {
	return new AtProtoClient(session);
}
