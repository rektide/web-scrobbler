import { ServiceCallResult } from '@/core/object/service-call-result';
import type { BaseSong } from '@/core/object/song';
import type { SessionData } from '@/core/scrobbler/base-scrobbler';
import BaseScrobbler from '@/core/scrobbler/base-scrobbler';
import type { AtProtoLexiconConfig } from '@/core/storage/wrapper';
import { AT_PROTO_LEXICONS as LEXICONS } from '@/core/storage/wrapper';
import {
	createAtProtoClient,
	AtProtoClient,
	AtProtoRequestError,
} from './atcute-client';
import {
	AuthMethodUnsatisfiableError,
	TokenRefreshError,
} from '@atcute/oauth-node-client';
import { mapSongToRecord } from './field-mapping';
import {
	getOAuthAccount,
	oauthClient,
	requestOAuthLock,
	signOutAtProto,
} from './oauth-client';
import { sendContentMessage } from '@/util/communication';
import browser from 'webextension-polyfill';

const DEFAULT_LEXICONS: AtProtoLexiconConfig = {
	teal: true,
	rocksky: true,
};

export default class AtProtoScrobbler extends BaseScrobbler<'AtProto'> {
	public isLocalOnly = false;

	public async getAuthUrl(): Promise<string> {
		return browser.runtime.getURL('src/ui/options/index.html?p=accounts');
	}

	public async getSession(): Promise<SessionData> {
		const account = await getOAuthAccount();
		if (!account) {
			throw new Error(ServiceCallResult.ERROR_AUTH);
		}

		return {
			sessionID: account.did,
			sessionName: account.did,
		};
	}

	public async isReadyForGrantAccess(): Promise<boolean> {
		return false;
	}

	public async needsReauthorization(): Promise<boolean> {
		const data = await this.storage.get();
		return (
			!(await getOAuthAccount()) &&
			Boolean(data?.oauthSession || data?.sessionID)
		);
	}

	public async sendNowPlaying(): Promise<ServiceCallResult> {
		return Promise.resolve(ServiceCallResult.RESULT_OK);
	}

	public async sendPaused(): Promise<ServiceCallResult> {
		return Promise.resolve(ServiceCallResult.RESULT_OK);
	}

	public async sendResumedPlaying(): Promise<ServiceCallResult> {
		return Promise.resolve(ServiceCallResult.RESULT_OK);
	}

	public async scrobble(
		songs: BaseSong[],
		_currentlyPlaying: boolean,
	): Promise<ServiceCallResult[]> {
		void _currentlyPlaying;
		let client: AtProtoClient | null;
		try {
			client = await this.getAtProtoClient();
		} catch (error) {
			return new Array<ServiceCallResult>(songs.length).fill(
				error instanceof TokenRefreshError ||
					error instanceof AuthMethodUnsatisfiableError
					? ServiceCallResult.ERROR_AUTH
					: ServiceCallResult.ERROR_OTHER,
			);
		}
		if (!client) {
			return new Array<ServiceCallResult>(songs.length).fill(
				ServiceCallResult.ERROR_AUTH,
			);
		}

		const enabledLexicons = await this.getEnabledLexicons();

		const results: ServiceCallResult[] = [];
		for (const song of songs) {
			let result = ServiceCallResult.RESULT_OK;
			for (const lexicon of LEXICONS) {
				if (
					!(lexicon.id in enabledLexicons) ||
					!enabledLexicons[lexicon.id]
				) {
					continue;
				}
				try {
					const record = mapSongToRecord(lexicon.id, song);
					await client.createRecord(
						lexicon.collection,
						record as unknown as Record<string, unknown>,
					);
				} catch (error) {
					result =
						error instanceof TokenRefreshError ||
						(error instanceof AtProtoRequestError &&
							error.status === 401)
							? ServiceCallResult.ERROR_AUTH
							: ServiceCallResult.ERROR_OTHER;
				}
			}
			results.push(result);
		}

		return results;
	}

	public async toggleLove(): Promise<
		ServiceCallResult | Record<string, never>
	> {
		return Promise.resolve({});
	}

	public async getSongInfo(): Promise<Record<string, never>> {
		return Promise.resolve({});
	}

	public getLabel(): 'AtProto' {
		return 'AtProto';
	}

	public getStatusUrl(): string {
		return '';
	}

	public getBaseProfileUrl(): string {
		return 'https://bsky.app/profile/';
	}

	protected getStorageName(): 'AtProto' {
		return 'AtProto';
	}

	public async signOut(): Promise<void> {
		const result = await sendContentMessage({
			type: 'atprotoSignOut',
			payload: undefined,
		});
		if (!result.ok) {
			throw new Error('AT Protocol signout failed');
		}
	}

	public async clearAuthorization(): Promise<void> {
		await signOutAtProto();
		// Explicit signout also forgets legacy credentials, but preserves preferences.
		const { AtProto: legacy } = await browser.storage.local.get('AtProto');
		if (legacy && typeof legacy === 'object') {
			const data: Record<string, unknown> = { ...legacy };
			delete data.sessionID;
			delete data.sessionName;
			delete data.oauthSession;
			delete data.isAuthStarted;
			await browser.storage.local.set({ AtProto: data });
		}
	}

	public async getAtProtoClient(): Promise<AtProtoClient | null> {
		return requestOAuthLock('lifecycle', async () => {
			const account = await getOAuthAccount();
			if (!account) {
				return null;
			}
			return createAtProtoClient(await oauthClient.restore(account.did));
		});
	}

	public async getEnabledLexicons(): Promise<AtProtoLexiconConfig> {
		const data = await this.storage.get();
		if (!data || !('lexicons' in data) || !data.lexicons) {
			return { ...DEFAULT_LEXICONS };
		}
		return { ...DEFAULT_LEXICONS, ...data.lexicons };
	}

	public async setLexiconEnabled(
		id: string,
		enabled: boolean,
	): Promise<void> {
		const lexicons = await this.getEnabledLexicons();
		(lexicons as Record<string, boolean>)[id] = enabled;
		const data = await this.storage.get();
		await this.storage.set({
			...(data || {}),
			lexicons,
		});
	}
}
