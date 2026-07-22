/**
 * Sync `localStorage` shim for contexts that lack it (notably MV3 service
 * workers). atcute's `createOAuthDatabase` calls `localStorage.getItem`/
 * `setItem` synchronously, so we back the synchronous `Storage` interface
 * with an in-memory `Map`, pre-loaded from extension storage on startup and
 * persisted fire-and-forget (the sync signature forbids awaiting writes).
 *
 * Context-agnostic:
 * - MV3 service worker (no localStorage, has browser/chrome.storage.local):
 *   installs the Map-backed shim with async persistence.
 * - Regular page (real localStorage present): no-op — atcute uses the native
 *   one. This module is still safe to import here.
 * - Node/test runner (no localStorage, no extension storage): installs an
 *   in-memory-only shim (no persistence), so logic can be exercised without a
 *   browser.
 */

const STORAGE_PREFIX = 'atcute-shim:';
const memory = new Map<string, string>();
let loaded = false;

type ExtStorage = {
	get: (keys: null) => Promise<Record<string, string>>;
	set: (items: Record<string, string>) => Promise<void>;
	remove: (keys: string | string[]) => Promise<void>;
};

/**
 * Lazily resolve the extension storage API. In Chrome MV3 the polyfill
 * (imported elsewhere in the background bundle) sets `globalThis.browser`;
 * Firefox provides it natively. `globalThis.chrome` covers the unpolyfilled
 * Chrome case (MV3 `chrome.storage.local` is promise-based). Returns null
 * outside extension contexts.
 */
function getExtStorage(): ExtStorage | null {
	const g = globalThis as unknown as {
		browser?: { storage?: { local?: ExtStorage } };
		chrome?: { storage?: { local?: ExtStorage } };
	};
	return g.browser?.storage?.local ?? g.chrome?.storage?.local ?? null;
}

if (typeof globalThis.localStorage === 'undefined') {
	const shim: Storage = {
		get length() {
			return memory.size;
		},
		clear() {
			for (const key of memory.keys()) {
				getExtStorage()?.remove(STORAGE_PREFIX + key);
			}
			memory.clear();
		},
		getItem(key: string): string | null {
			return memory.get(key) ?? null;
		},
		key(index: number): string | null {
			return [...memory.keys()][index] ?? null;
		},
		removeItem(key: string): void {
			memory.delete(key);
			getExtStorage()?.remove(STORAGE_PREFIX + key);
		},
		setItem(key: string, value: string): void {
			memory.set(key, value);
			getExtStorage()?.set({ [STORAGE_PREFIX + key]: value });
		},
	};
	Object.defineProperty(globalThis, 'localStorage', {
		value: shim,
		writable: false,
		configurable: true,
	});
}

export async function initLocalStorageShim(): Promise<void> {
	if (loaded) return;
	loaded = true;

	const ext = getExtStorage();
	if (!ext) {
		// No persistence backend (e.g. test runner); in-memory only.
		return;
	}

	const data = await ext.get(null);
	for (const [key, value] of Object.entries(data)) {
		if (key.startsWith(STORAGE_PREFIX)) {
			memory.set(key.slice(STORAGE_PREFIX.length), value as string);
		}
	}
}
