import browser from 'webextension-polyfill';

const STORAGE_PREFIX = 'atcute-shim:';
const memory = new Map<string, string>();
let loaded = false;

if (typeof globalThis.localStorage === 'undefined') {
	const shim: Storage = {
		get length() {
			return memory.size;
		},
		clear() {
			for (const key of memory.keys()) {
				browser.storage.local.remove(STORAGE_PREFIX + key);
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
			browser.storage.local.remove(STORAGE_PREFIX + key);
		},
		setItem(key: string, value: string): void {
			memory.set(key, value);
			browser.storage.local.set({ [STORAGE_PREFIX + key]: value });
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

	const data = await browser.storage.local.get(null);
	for (const [key, value] of Object.entries(data)) {
		if (key.startsWith(STORAGE_PREFIX)) {
			memory.set(key.slice(STORAGE_PREFIX.length), value as string);
		}
	}
}
