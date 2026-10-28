import scrobbleService from '@/core/object/scrobble-service';
import Song from '@/core/object/song';
import type AtProtoScrobbler from '@/core/scrobbler/atproto/atproto-scrobbler';
import { generateDpopKey } from '@atcute/oauth-crypto';
import type { Session } from '@atcute/oauth-browser-client';

declare global {
	interface Window {
		scrobbleService: typeof scrobbleService;
		atproto: AtProtoScrobbler;
		Song: typeof Song;
		testSession: Session;
		ready: boolean;
	}
}

window.scrobbleService = scrobbleService;
window.atproto = scrobbleService.getScrobblerByLabel(
	'AtProto',
) as AtProtoScrobbler;
window.Song = Song;

async function init() {
	const dpopKey = await generateDpopKey();

	const session: Session = {
		dpopKey,
		info: {
			sub: 'did:plc:test123',
			aud: 'https://test.pds.example.com',
			server: {
				issuer: 'https://test.pds.example.com',
				authorization_endpoint:
					'https://test.pds.example.com/oauth/authorize',
				token_endpoint: 'https://test.pds.example.com/oauth/token',
				pushed_authorization_request_endpoint:
					'https://test.pds.example.com/oauth/par',
				introspection_endpoint:
					'https://test.pds.example.com/oauth/introspect',
				revocation_endpoint:
					'https://test.pds.example.com/oauth/revoke',
			},
		},
		token: {
			access: 'test-access-token',
			refresh: 'test-refresh-token',
			type: 'DPoP',
			expires_at: Date.now() + 3600_000,
			scope: 'atproto transition:generic',
		},
	};

	window.testSession = session;
	window.ready = true;

	document.body.innerHTML = '<h1>Web Scrobbler Test Harness</h1>';
}

void init();
