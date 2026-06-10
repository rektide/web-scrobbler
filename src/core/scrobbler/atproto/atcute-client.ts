import { OAuthUserAgent } from '@atcute/oauth-browser-client';
import type { AtProtoOAuthSession } from '@/core/storage/wrapper';

export class AtProtoClient {
	private agent: OAuthUserAgent;
	public readonly did: string;

	constructor(session: AtProtoOAuthSession) {
		this.agent = new OAuthUserAgent(session as unknown as ConstructorParameters<typeof OAuthUserAgent>[0]);
		this.did = session.info.sub;
	}

	async createRecord(
		collection: string,
		record: Record<string, unknown>,
	): Promise<{ uri: string; cid: string }> {
		const pdsUrl = this.agent.session.info.aud;
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

export async function createAtProtoClient(
	session: AtProtoOAuthSession,
): Promise<AtProtoClient> {
	return new AtProtoClient(session);
}
