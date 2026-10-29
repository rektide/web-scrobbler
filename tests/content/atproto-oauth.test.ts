import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { atprotoOAuthListen } from '@/core/content/atproto-oauth';
import {
	oauthRedirectUri,
	oauthMessageOrigin,
	OAUTH_CALLBACK_MESSAGE,
	OAUTH_CALLBACK_RESULT,
} from '@/core/scrobbler/atproto/oauth-config';
import { sendContentMessage } from '@/util/communication';

vi.mock('@/util/communication', () => ({ sendContentMessage: vi.fn() }));
vi.mock('webextension-polyfill', () => ({ default: {} }));
let receive: (event: unknown) => void;
const page = {
	location: { href: oauthRedirectUri },
	addEventListener: (_type: string, listener: (event: unknown) => void) => {
		receive = listener;
	},
	postMessage: vi.fn(),
};
const message = {
	type: OAUTH_CALLBACK_MESSAGE,
	search: '?state=test&iss=https://as.example&code=test',
};
beforeEach(() => {
	vi.resetAllMocks();
	page.location.href = oauthRedirectUri;
	vi.stubGlobal('window', page);
	vi.mocked(sendContentMessage).mockResolvedValue({ ok: true });
	atprotoOAuthListen();
});
afterEach(() => {
	vi.unstubAllGlobals();
});

it('accepts only a same-window, same-origin callback and returns a credential-free acknowledgement once', async () => {
	receive({ source: page, origin: oauthMessageOrigin, data: message });
	receive({ source: page, origin: oauthMessageOrigin, data: message });
	await vi.waitFor(() =>
		expect(page.postMessage).toHaveBeenCalledWith(
			{ type: OAUTH_CALLBACK_RESULT, ok: true },
			oauthMessageOrigin,
		),
	);
	expect(sendContentMessage).toHaveBeenCalledExactlyOnceWith({
		type: 'atprotoOAuthCallback',
		payload: { search: message.search },
	});
});

it('ignores foreign windows/origins, wrong paths, old token transfers and malformed payloads', () => {
	for (const event of [
		{ source: {}, origin: oauthMessageOrigin, data: message },
		{ source: page, origin: 'https://evil.example', data: message },
		{
			source: page,
			origin: oauthMessageOrigin,
			data: { type: 'web-scrobbler-teal/oauth-session', session: {} },
		},
		{
			source: page,
			origin: oauthMessageOrigin,
			data: { ...message, search: {} },
		},
	]) {
		receive(event);
	}
	page.location.href = `${oauthRedirectUri}/extra`;
	receive({ source: page, origin: oauthMessageOrigin, data: message });
	expect(sendContentMessage).not.toHaveBeenCalled();
});

it('returns a safe failure when background messaging fails', async () => {
	vi.mocked(sendContentMessage).mockRejectedValueOnce(
		new Error('background unavailable'),
	);
	receive({ source: page, origin: oauthMessageOrigin, data: message });
	await vi.waitFor(() =>
		expect(page.postMessage).toHaveBeenCalledWith(
			{ type: OAUTH_CALLBACK_RESULT, ok: false },
			oauthMessageOrigin,
		),
	);
});
