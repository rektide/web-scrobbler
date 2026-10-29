import 'vite/types/importMeta.d.ts';

declare global {
	interface ImportMetaEnv {
		readonly VITE_ATPROTO_OAUTH_ORIGIN?: string;
	}
}
