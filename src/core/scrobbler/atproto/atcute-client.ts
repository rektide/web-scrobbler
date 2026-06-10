import {
	configureOAuth,
	OAuthUserAgent,
	type Session,
} from '@atcute/oauth-browser-client';
import {
	CompositeDidDocumentResolver,
	LocalActorResolver,
	PlcDidDocumentResolver,
	WebDidDocumentResolver,
	XrpcHandleResolver,
} from '@atcute/identity-resolver';
import { initLocalStorageShim } from './localstorage-shim';

let configured = false;

export async function initAtcute(): Promise<void> {
	if (configured) return;
	configured = true;

	await initLocalStorageShim();

	configureOAuth({
		metadata: {
			client_id: 'https://rektide.github.io/oauth-client-metadata.json',
			redirect_uri: 'https://rektide.github.io/oauth/callback',
		},
		identityResolver: new LocalActorResolver({
			handleResolver: new XrpcHandleResolver({
				serviceUrl: 'https://public.api.bsky.app',
			}),
			didDocumentResolver: new CompositeDidDocumentResolver({
				methods: {
					plc: new PlcDidDocumentResolver(),
					web: new WebDidDocumentResolver(),
				},
			}),
		}),
	});
}

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
