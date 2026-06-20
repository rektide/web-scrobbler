import { sendContentMessage } from '@/util/communication';
import { oauthMessageOrigin } from '@/core/scrobbler/atproto/oauth-config';

const OAUTH_MESSAGE_TYPE = 'web-scrobbler-teal/oauth-session';

export function atprotoOAuthListen(): void {
	window.addEventListener('message', (event) => {
		if (event.origin !== oauthMessageOrigin) {
			return;
		}

		if (event.data?.type !== OAUTH_MESSAGE_TYPE) {
			return;
		}

		const { session, handle } = event.data;
		if (!session?.info?.sub || !session?.info?.aud) {
			return;
		}

		const sessionID = session.info.sub as string;

		sendContentMessage({
			type: 'atprotoOAuthSession',
			payload: {
				session: {
					sessionID,
					sessionName: handle ?? sessionID,
					oauthSession: session,
				},
			},
		});
	});
}
