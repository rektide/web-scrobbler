import browser from 'webextension-polyfill';
import { isOAuthCallbackUrl } from './oauth-config';

export function isOAuthCallbackSender(
	sender: browser.Runtime.MessageSender,
): boolean {
	return (
		sender.id === browser.runtime.id &&
		sender.frameId === 0 &&
		typeof sender.tab?.id === 'number' &&
		typeof sender.url === 'string' &&
		isOAuthCallbackUrl(sender.url)
	);
}

export function isOAuthOptionsSender(
	sender: browser.Runtime.MessageSender,
): boolean {
	const options = browser.runtime.getURL('src/ui/options/index.html');
	return (
		sender.id === browser.runtime.id &&
		(sender.url === options ||
			sender.url?.startsWith(`${options}?`) === true)
	);
}

/** Reject ambiguous/oversized messages before handing protocol checks to atcute. */
export function isOAuthCallbackSearch(search: unknown): search is string {
	if (typeof search !== 'string' || search.length > 8192) {
		return false;
	}
	const params = new URLSearchParams(search);
	for (const key of params.keys()) {
		if (params.getAll(key).length !== 1) {
			return false;
		}
	}
	return (
		Boolean(params.get('state') && params.get('iss')) &&
		Boolean(params.get('code')) !== Boolean(params.get('error'))
	);
}
