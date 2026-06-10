import { ServiceCallResult } from '@/core/object/service-call-result';
import type { BaseSong } from '@/core/object/song';
import type { SessionData } from '@/core/scrobbler/base-scrobbler';
import BaseScrobbler from '@/core/scrobbler/base-scrobbler';
import type { AtProtoModel } from '@/core/storage/wrapper';
import {
	ATPROTO_OAUTH_CONNECT_URL,
	ATPROTO_OAUTH_ORIGIN,
} from './atproto-types';

export default class AtProtoScrobbler extends BaseScrobbler<'AtProto'> {
	public isLocalOnly = false;

	public async getAuthUrl(): Promise<string> {
		await this.storage.set({ isAuthStarted: true });
		return ATPROTO_OAUTH_CONNECT_URL;
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
		_songs: BaseSong[],
		_currentlyPlaying: boolean,
	): Promise<ServiceCallResult[]> {
		return Promise.resolve([ServiceCallResult.RESULT_OK]);
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
		oauthSession: unknown;
	}): Promise<void> {
		await this.storage.set({
			sessionID: session.sessionID,
			sessionName: session.sessionName,
			oauthSession: session.oauthSession as (AtProtoModel & { oauthSession: unknown })['oauthSession'],
		});
	}

	public async getOAuthSession(): Promise<unknown | null> {
		const data = await this.storage.get();
		if (!data || !('oauthSession' in data)) {
			return null;
		}
		return data.oauthSession ?? null;
	}
}
