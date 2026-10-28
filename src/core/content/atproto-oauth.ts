import { sendContentMessage } from '@/util/communication';
import {
	isOAuthCallbackUrl,
	oauthMessageOrigin,
	OAUTH_CALLBACK_MESSAGE,
	OAUTH_CALLBACK_RESULT,
} from '@/core/scrobbler/atproto/oauth-config';
import { isOAuthCallbackSearch } from '@/core/scrobbler/atproto/oauth-messages';

export function atprotoOAuthListen(): void {
	let received = false;
	window.addEventListener('message', (event: MessageEvent<unknown>) => {
		if (
			received ||
			event.source !== window ||
			event.origin !== oauthMessageOrigin ||
			!isOAuthCallbackUrl(window.location.href)
		) {
			return;
		}
		const data = event.data as { type?: unknown; search?: unknown } | null;
		if (
			data?.type !== OAUTH_CALLBACK_MESSAGE ||
			!isOAuthCallbackSearch(data.search)
		) {
			return;
		}
		received = true;
		void sendContentMessage({
			type: 'atprotoOAuthCallback',
			payload: { search: data.search },
		}).then(
			(result) =>
				window.postMessage(
					{ type: OAUTH_CALLBACK_RESULT, ok: result.ok },
					oauthMessageOrigin,
				),
			() =>
				window.postMessage(
					{ type: OAUTH_CALLBACK_RESULT, ok: false },
					oauthMessageOrigin,
				),
		);
	});
}
