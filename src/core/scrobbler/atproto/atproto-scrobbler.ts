import { ServiceCallResult } from '@/core/object/service-call-result';
import type { BaseSong } from '@/core/object/song';
import type { SessionData } from '@/core/scrobbler/base-scrobbler';
import BaseScrobbler from '@/core/scrobbler/base-scrobbler';
import type {
	AtProtoModel,
	AtProtoLexiconConfig,
} from '@/core/storage/wrapper';
import type { Session } from '@atcute/oauth-browser-client';
import { AT_PROTO_LEXICONS as LEXICONS } from '@/core/storage/wrapper';
import { createAtProtoClient, AtProtoClient, initAtcute } from './atcute-client';
import { mapSongToRecord } from './field-mapping';
import { oauthConnectUrl } from './oauth-config';

const DEFAULT_LEXICONS: AtProtoLexiconConfig = {
	teal: true,
	rocksky: true,
};

export default class AtProtoScrobbler extends BaseScrobbler<'AtProto'> {
	public isLocalOnly = false;

	public async getAuthUrl(): Promise<string> {
		await this.storage.set({ isAuthStarted: true });
		return oauthConnectUrl;
	}

	public async getSession(): Promise<SessionData> {
		const data = await this.storage.get();
		if (!data) {
			this.debugLog('no data', 'error');
			throw new Error(ServiceCallResult.ERROR_AUTH);
		}

		if ('isAuthStarted' in data && data.isAuthStarted) {
			throw new Error(ServiceCallResult.ERROR_AUTH);
		}

		if (!('sessionID' in data) || !data.sessionID) {
			throw new Error(ServiceCallResult.ERROR_AUTH);
		}

		return {
			sessionID: data.sessionID,
			sessionName: 'sessionName' in data ? data.sessionName : undefined,
		};
	}

	public async isReadyForGrantAccess(): Promise<boolean> {
		const data = await this.storage.get();
		if (!data || !('isAuthStarted' in data)) {
			return false;
		}
		return data.isAuthStarted ?? false;
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
		const client = await this.getAtProtoClient();
		if (!client) {
			return new Array<ServiceCallResult>(songs.length).fill(
				ServiceCallResult.ERROR_AUTH,
			);
		}

		const enabledLexicons = await this.getEnabledLexicons();

		const results: ServiceCallResult[] = [];
		for (const song of songs) {
			let songOk = true;
			for (const lexicon of LEXICONS) {
				if (!(lexicon.id in enabledLexicons) || !enabledLexicons[lexicon.id]) continue;
				try {
					const record = mapSongToRecord(lexicon.id, song);
					await client.createRecord(
						lexicon.collection,
						record as unknown as Record<string, unknown>,
					);
				} catch {
					songOk = false;
				}
			}
			results.push(songOk ? ServiceCallResult.RESULT_OK : ServiceCallResult.ERROR_OTHER);
		}

		return results;
	}

	public async toggleLove(): Promise<ServiceCallResult | Record<string, never>> {
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
		await this.storage.set({});
	}

	public async storeOAuthSession(session: {
		sessionID: string;
		sessionName: string;
		oauthSession: Session;
	}): Promise<void> {
		const data = await this.storage.get();
		const lexicons = (data && 'lexicons' in data && data.lexicons) || DEFAULT_LEXICONS;
		await this.storage.set({
			sessionID: session.sessionID,
			sessionName: session.sessionName,
			oauthSession: session.oauthSession,
			lexicons,
		});
	}

	public async getOAuthSession(): Promise<Session | null> {
		const data = await this.storage.get();
		if (!data || !('oauthSession' in data)) {
			return null;
		}
		return data.oauthSession ?? null;
	}

	public async getAtProtoClient(): Promise<AtProtoClient | null> {
		await initAtcute();
		const session = await this.getOAuthSession();
		if (!session) {
			return null;
		}
		return createAtProtoClient(session);
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
