import type { BaseSong } from '@/core/object/song';
import type { AtProtoLexiconId } from '@/core/storage/wrapper';

export interface TealPlayRecord {
	$type: 'fm.teal.alpha.feed.play';
	trackName: string;
	recordingMbId?: string;
	duration?: number;
	artists?: { artistName: string; artistMbId?: string }[];
	releaseName?: string;
	releaseMbId?: string;
	isrc?: string;
	originUrl?: string;
	musicServiceBaseDomain?: string;
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
	createdAt?: string;
}

export type AtProtoRecord = TealPlayRecord | RockskyScrobbleRecord;

function getMusicServiceDomain(song: BaseSong): string | undefined {
	const url = song.getOriginUrl();
	if (!url) return undefined;
	try {
		return new URL(url).hostname;
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
		$type: 'fm.teal.alpha.feed.play',
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
		record.originUrl = originUrl;
	}

	const domain = getMusicServiceDomain(song);
	if (domain) {
		record.musicServiceBaseDomain = domain;
	}

	return record;
}

export function mapToRocksky(song: BaseSong): RockskyScrobbleRecord {
	const record: RockskyScrobbleRecord = {
		$type: 'app.rocksky.scrobble',
		title: song.getTrack() ?? '',
		createdAt: getPlayedTime(song),
	};

	const artist = song.getArtist();
	if (artist) {
		record.artist = artist;
		record.artists = [{ name: artist }];
	}

	const album = song.getAlbum();
	if (album) {
		record.album = album;
	}

	const albumArtist = song.getAlbumArtist();
	if (albumArtist) {
		record.albumArtist = albumArtist;
	}

	const duration = song.getDuration();
	if (duration) {
		record.duration = duration * 1000;
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
