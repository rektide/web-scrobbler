import { sendContentMessage } from '@/util/communication';

const ATPROTO_OAUTH_ORIGIN = 'https://rektide.github.io';
const OAUTH_MESSAGE_TYPE = 'web-scrobbler-teal/oauth-session';

export function atprotoOAuthListen(): void {
	window.addEventListener('message', (event) => {
		if (event.origin !== ATPROTO_OAUTH_ORIGIN) {
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
