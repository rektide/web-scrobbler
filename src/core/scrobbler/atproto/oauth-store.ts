import type { Store } from '@atcute/oauth-node-client';
import browser from 'webextension-polyfill';
import { oauthClientId } from './oauth-config';

// Separate client IDs (including project-page subpaths) must not share grants.
export const OAUTH_STORAGE_PREFIX = `AtProtoOAuth:v1:${encodeURIComponent(oauthClientId)}:`;

type StorageArea = Pick<browser.Storage.StorageArea, 'get' | 'set' | 'remove'>;

/** Awaitable, per-entry storage. Never use StorageWrapper's swallowed write errors. */
export class OAuthStore<K extends string, V> implements Store<K, V> {
	constructor(
		public prefix: string,
		public storage: StorageArea = browser.storage.local,
		public isExpired?: (value: V) => boolean,
	) {}

	key(key: K): string {
		return this.prefix + encodeURIComponent(key);
	}

	async get(key: K): Promise<V | undefined> {
		const value = (await this.storage.get(this.key(key)))[this.key(key)] as
			| V
			| undefined;
		return value !== undefined && !this.isExpired?.(value)
			? value
			: undefined;
	}

	async set(key: K, value: V): Promise<void> {
		await this.storage.set({ [this.key(key)]: value });
	}

	async delete(key: K): Promise<void> {
		await this.storage.remove(this.key(key));
	}

	/** Only called for deliberate cancellation/signout, never background pruning. */
	async clear(): Promise<void> {
		const data = await this.storage.get(null);
		const keys = Object.keys(data).filter((key) =>
			key.startsWith(this.prefix),
		);
		if (keys.length) {
			await this.storage.remove(keys);
		}
	}
}
