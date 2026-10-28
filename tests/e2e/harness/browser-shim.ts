import messages from '@/_locales/en/messages.json';

const storageData = JSON.parse(
	sessionStorage.getItem('extension-storage') ?? '{}',
) as Record<string, unknown>;
type StorageChange = { oldValue?: unknown; newValue?: unknown };
const storageListeners = new Set<
	(changes: Record<string, StorageChange>, area: string) => void
>();
function notify(changes: Record<string, StorageChange>) {
	sessionStorage.setItem('extension-storage', JSON.stringify(storageData));
	for (const listener of storageListeners) {
		listener(changes, 'local');
	}
}

const messageListeners: Array<{
	fn: (message: unknown, sender: unknown) => unknown;
}> = [];

type Tab = {
	id: number;
	url?: string;
	active?: boolean;
	audible?: boolean;
};

let nextTabId = 1;
const tabs = new Map<number, Tab>();
function unused(...args: unknown[]) {
	void args;
}

const browser = {
	storage: {
		onChanged: {
			addListener(
				fn: (
					changes: Record<string, StorageChange>,
					area: string,
				) => void,
			) {
				storageListeners.add(fn);
			},
			removeListener(
				fn: (
					changes: Record<string, StorageChange>,
					area: string,
				) => void,
			) {
				storageListeners.delete(fn);
			},
		},
		local: {
			async get(
				keys?: string | string[] | Record<string, unknown> | null,
			) {
				if (keys === null || keys === undefined) {
					return { ...storageData };
				}
				if (typeof keys === 'string') {
					const result: Record<string, unknown> = {};
					if (keys in storageData) {
						result[keys] = storageData[keys];
					}
					return result;
				}
				if (Array.isArray(keys)) {
					const result: Record<string, unknown> = {};
					for (const key of keys) {
						if (key in storageData) {
							result[key] = storageData[key];
						}
					}
					return result;
				}
				const result: Record<string, unknown> = {};
				for (const [key, defaultVal] of Object.entries(keys)) {
					result[key] =
						key in storageData ? storageData[key] : defaultVal;
				}
				return result;
			},
			async set(data: Record<string, unknown>) {
				const changes = Object.fromEntries(
					Object.entries(data).map(([key, value]) => [
						key,
						{ oldValue: storageData[key], newValue: value },
					]),
				);
				Object.assign(storageData, data);
				notify(changes);
			},
			async remove(keys: string | string[]) {
				const arr = typeof keys === 'string' ? [keys] : keys;
				const changes: Record<string, StorageChange> = {};
				for (const key of arr) {
					changes[key] = { oldValue: storageData[key] };
					delete storageData[key];
				}
				notify(changes);
			},
		},
	},
	permissions: {
		async contains() {
			return true;
		},
	},
	i18n: {
		getMessage(
			key: keyof typeof messages,
			substitutions?: string | string[],
		) {
			const message = messages[key]?.message ?? key;
			return message.replace('$1', String(substitutions ?? ''));
		},
	},
	runtime: {
		onMessage: {
			addListener(fn: (message: unknown, sender: unknown) => unknown) {
				messageListeners.push({ fn });
			},
			removeListener(fn: (message: unknown, sender: unknown) => unknown) {
				const idx = messageListeners.findIndex((l) => l.fn === fn);
				if (idx >= 0) {
					messageListeners.splice(idx, 1);
				}
			},
		},
		onStartup: { addListener: unused },
		onInstalled: { addListener: unused },
		async sendMessage(message: unknown) {
			const sender = {
				tab: { id: 1 },
				url: 'https://rektide.github.io/oauth/callback',
			};
			for (const { fn } of messageListeners) {
				const result = fn(message, sender);
				if (result !== undefined) {
					return result;
				}
			}
		},
		getURL(path: string) {
			return `/mock-extension/${path}`;
		},
		getManifest() {
			return { version: '0.0.0-test' };
		},
		id: 'test-extension-id',
	},
	tabs: {
		async create(props: { url?: string }) {
			const id = nextTabId++;
			tabs.set(id, { id, ...props });
			return { id, ...props };
		},
		async get(id: number) {
			return tabs.get(id) ?? { id, audible: true };
		},
		onRemoved: { addListener: unused },
		onUpdated: { addListener: unused },
		onActivated: { addListener: unused },
	},
	contextMenus: {
		create: unused,
		onClicked: { addListener: unused },
	},
	commands: {
		onCommand: { addListener: unused },
	},
};

export default browser;
