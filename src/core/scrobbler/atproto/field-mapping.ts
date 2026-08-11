import type { BaseSong } from '@/core/object/song';
import type { AtProtoLexiconId } from '@/core/storage/wrapper';

export interface TealPlayRecord {
	$type: 'fm.teal.feed.play';
	trackName: string;
	recordingMbId?: string;
	duration?: number;
	artists?: { artistName: string; artistMbId?: string }[];
	releaseName?: string;
	releaseMbId?: string;
	isrc?: string;
	originUri?: string;
	musicServiceUri?: string;
	submissionClientAgent?: string;
	playedTime?: string;
}

export interface RockskyScrobbleRecord {
	$type: 'app.rocksky.scrobble';
	title: string;
	artist?: string;
	artists?: { name: string; mbid?: string }[];
	album?: string;
	albumArtist?: string;
	duration?: number;
	mbid?: string;
	isrc?: string;
	tags?: string[];
	createdAt?: string;
}

export type AtProtoRecord = TealPlayRecord | RockskyScrobbleRecord;

function getMusicServiceDomain(song: BaseSong): string | undefined {
	const url = song.getOriginUrl();
	if (url) {
		try {
			return new URL(url).hostname;
		} catch {
			// not a valid URL, fall through
		}
	}

	for (const pattern of song.connector.matches) {
		const match = pattern.match(/^\*:\/\/(?:\*\.)?([^/*]+)/);
		if (match) {
			return match[1];
		}
	}

	return undefined;
}

function getMusicServiceUri(song: BaseSong): string | undefined {
	const originUrl = song.getOriginUrl();
	if (!originUrl) {
		return undefined;
	}

	try {
		const { origin } = new URL(originUrl);
		return origin === 'null' ? undefined : `${origin}/`;
	} catch {
		return undefined;
	}
}

function getPlayedTime(song: BaseSong): string {
	if (song.metadata.startTimestamp) {
		return new Date(song.metadata.startTimestamp * 1000).toISOString();
	}
	return new Date().toISOString();
}

export function mapToTeal(song: BaseSong): TealPlayRecord {
	const record: TealPlayRecord = {
		$type: 'fm.teal.feed.play',
		trackName: song.getTrack() ?? '',
		playedTime: getPlayedTime(song),
	};

	const artist = song.getArtist();
	if (artist) {
		record.artists = [{ artistName: artist }];
	}

	const album = song.getAlbum();
	if (album) {
		record.releaseName = album;
	}

	const duration = song.getDuration();
	if (duration) {
		record.duration = duration;
	}

	const originUrl = song.getOriginUrl();
	if (originUrl) {
		record.originUri = originUrl;
	}

	const musicServiceUri = getMusicServiceUri(song);
	if (musicServiceUri) {
		record.musicServiceUri = musicServiceUri;
	}

	return record;
}

export function mapToRocksky(song: BaseSong): RockskyScrobbleRecord {
	const artist = song.getArtist() ?? 'Unknown';
	const album = song.getAlbum() ?? 'Unknown';
	const albumArtist = song.getAlbumArtist() ?? artist;

	const record: RockskyScrobbleRecord = {
		$type: 'app.rocksky.scrobble',
		title: song.getTrack() ?? 'Unknown',
		artist,
		artists: [{ name: artist }],
		album,
		albumArtist,
		duration: (song.getDuration() ?? 0) * 1000,
		createdAt: getPlayedTime(song),
	};

	const domain = getMusicServiceDomain(song);
	if (domain) {
		record.tags = [domain];
	}

	return record;
}

export function mapSongToRecord(
	lexiconId: AtProtoLexiconId,
	song: BaseSong,
): AtProtoRecord {
	switch (lexiconId) {
		case 'teal':
			return mapToTeal(song);
		case 'rocksky':
			return mapToRocksky(song);
	}
}
