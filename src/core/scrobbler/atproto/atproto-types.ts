export interface AtProtoPlayRecord {
	trackName: string;
	recordingMbId?: string;
	trackMbId?: string;
	duration?: number;
	artists?: {
		artistName: string;
		artistMbId?: string;
	}[];
	releaseName?: string;
	releaseMbId?: string;
	isrc?: string;
	originUrl?: string;
	musicServiceBaseDomain?: string;
	submissionClientAgent?: string;
	playedTime?: string;
	trackDiscriminant?: string;
	releaseDiscriminant?: string;
}

export const ATPROTO_OAUTH_ORIGIN = 'https://rektide.github.io';
export const ATPROTO_OAUTH_CONNECT_URL = `${ATPROTO_OAUTH_ORIGIN}/oauth/connect`;
export const ATPROTO_OAUTH_CALLBACK_PATH = '/oauth/callback';
