import scrobbleService from '@/core/object/scrobble-service';
import Song from '@/core/object/song';
import type AtProtoScrobbler from '@/core/scrobbler/atproto/atproto-scrobbler';
import { generateDpopKey } from '@atcute/oauth-crypto';
import type { StoredSession } from '@atcute/oauth-node-client';
import {
	oauthStores,
	oauthAccounts,
} from '@/core/scrobbler/atproto/oauth-client';
import { TEST_DID, TEST_PDS } from '../../mocks/atproto-oauth';
import { render } from 'solid-js/web';
import AtProtoAccount from '@/ui/options/components/atproto-account';
import browser from 'webextension-polyfill';
import {
	setupBackgroundListeners,
	backgroundListener,
} from '@/util/communication';

declare global {
	interface Window {
		scrobbleService: typeof scrobbleService;
		atproto: AtProtoScrobbler;
		Song: typeof Song;
		testSession: StoredSession;
		seedSession: () => Promise<void>;
		browser: typeof browser;
		ready: boolean;
	}
}

window.scrobbleService = scrobbleService;
window.atproto = scrobbleService.getScrobblerByLabel(
	'AtProto',
) as AtProtoScrobbler;
window.Song = Song;
window.browser = browser;
setupBackgroundListeners(
	backgroundListener({
		type: 'atprotoSignOut',
		fn: async () => {
			await window.atproto.clearAuthorization();
			return { ok: true };
		},
	}),
);

async function init() {
	const dpopKey = await generateDpopKey();

	const session: StoredSession = {
		dpopKey,
		authMethod: { method: 'none' },
		tokenSet: {
			sub: TEST_DID,
			aud: TEST_PDS,
			iss: TEST_PDS,
			access_token: 'test-access-token',
			refresh_token: 'test-refresh-token',
			token_type: 'DPoP',
			expires_at: Date.now() + 3600_000,
			scope: 'atproto transition:generic',
		},
	};

	window.testSession = session;
	window.seedSession = async () => {
		await oauthStores.sessions.set(TEST_DID, session);
		await oauthAccounts.set('active', { did: TEST_DID });
	};
	const root = document.createElement('div');
	document.body.append(root);
	render(AtProtoAccount, root);
	window.ready = true;
}

void init();
