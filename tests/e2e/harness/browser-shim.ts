const storageData: Record<string, unknown> = {};

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

const browser = {
	storage: {
		local: {
			async get(keys?: string | string[] | Record<string, unknown> | null) {
				if (keys === null || keys === undefined) {
					return { ...storageData };
				}
				if (typeof keys === 'string') {
					const result: Record<string, unknown> = {};
					if (keys in storageData) result[keys] = storageData[keys];
					return result;
				}
				if (Array.isArray(keys)) {
					const result: Record<string, unknown> = {};
					for (const key of keys) {
						if (key in storageData) result[key] = storageData[key];
					}
					return result;
				}
				const result: Record<string, unknown> = {};
				for (const [key, defaultVal] of Object.entries(keys)) {
					result[key] = key in storageData ? storageData[key] : defaultVal;
				}
				return result;
			},
			async set(data: Record<string, unknown>) {
				Object.assign(storageData, data);
			},
			async remove(keys: string | string[]) {
				const arr = typeof keys === 'string' ? [keys] : keys;
				for (const key of arr) {
					delete storageData[key];
				}
			},
		},
	},
	runtime: {
		onMessage: {
			addListener(fn: (message: unknown, sender: unknown) => unknown) {
				messageListeners.push({ fn });
			},
			removeListener(fn: (message: unknown, sender: unknown) => unknown) {
				const idx = messageListeners.findIndex((l) => l.fn === fn);
				if (idx >= 0) messageListeners.splice(idx, 1);
			},
		},
		onStartup: { addListener(_fn: () => void) {} },
		onInstalled: { addListener(_fn: () => void) {} },
		async sendMessage(message: unknown) {
			const sender = { tab: { id: 1 }, url: 'https://rektide.github.io/oauth/callback' };
			for (const { fn } of messageListeners) {
				const result = fn(message, sender);
				if (result !== undefined) return result;
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
		onRemoved: { addListener(_fn: () => void) {} },
		onUpdated: { addListener(_fn: () => void) {} },
		onActivated: { addListener(_fn: () => void) {} },
	},
	contextMenus: {
		create(_props: unknown) {},
		onClicked: { addListener(_fn: () => void) {} },
	},
	commands: {
		onCommand: { addListener(_fn: () => void) {} },
	},
};

export default browser;
