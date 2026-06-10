import { sendContentMessage } from '@/util/communication';
import { ATPROTO_OAUTH_ORIGIN } from '@/core/scrobbler/atproto/atproto-types';

const OAUTH_MESSAGE_TYPE = 'web-scrobbler-teal/oauth-session';

export function atprotoOAuthListen(): void {
	window.addEventListener('message', (event) => {
		if (event.origin !== ATPROTO_OAUTH_ORIGIN) {
			return;
		}

		if (event.data?.type !== OAUTH_MESSAGE_TYPE) {
			return;
		}

		const { session } = event.data;
		if (!session?.info?.sub || !session?.info?.aud) {
			return;
		}

		const sessionID = session.info.sub as string;
		const handle = (session.info as Record<string, unknown>).handle as string | undefined;

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
