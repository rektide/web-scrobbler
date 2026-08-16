import type { ExternalIdentifier, Station } from '@/core/types';

interface RadioCultPublicStation {
	id?: string;
	name?: string;
	description?: string;
	artwork?: string;
	country?: string[];
	socials?: {
		site?: string;
		instagramHandle?: string;
		facebook?: string;
	};
	channels?: {
		name?: string;
		streamingUrl?: string;
		stream_url?: string;
	}[];
}

interface RadioCultResponse {
	station?: RadioCultPublicStation;
}

const RADIOCULT_URI = 'https://radiocult.fm/';

function stripTrademarkSymbols(value: string | undefined): string | undefined {
	return value
		?.replace(/[®™]/gu, '')
		.replace(/\s*\((?:R|TM)\)/giu, '')
		.replace(/\s{2,}/gu, ' ')
		.trim();
}

export function filterStationNames(
	station: Station,
	shouldStripTrademarkSymbols: boolean,
): Station {
	if (!shouldStripTrademarkSymbols) {
		return station;
	}
	return {
		...station,
		label: stripTrademarkSymbols(station.label),
		name: stripTrademarkSymbols(station.name),
	};
}

function normalizeUri(value: string | undefined): string | undefined {
	if (!value) {
		return;
	}
	try {
		const url = new URL(value);
		return url.pathname === '/' && !url.search && !url.hash
			? `${url.origin}/`
			: url.href;
	} catch {
		return undefined;
	}
}

function parseBroadcastIdentity(label: string) {
	const frequencyMatch = label.match(/\b(\d{2,4}(?:\.\d+)?)\s*(FM|AM)\b/);
	if (!frequencyMatch) {
		return {};
	}
	const callSign =
		label.match(
			/\b([A-Z]{3,4})\s+(?=\d{2,4}(?:\.\d+)?\s*(?:FM|AM)\b)/,
		)?.[1] ?? label.match(/\b(?:FM|AM)\s+([A-Z]{3,4})\b/)?.[1];
	return {
		...(callSign ? { callSign } : {}),
		frequencyHz: Math.round(
			Number(frequencyMatch[1]) *
				(frequencyMatch[2] === 'AM' ? 1_000 : 1_000_000),
		),
		band: frequencyMatch[2],
	};
}

function socialIdentifiers(
	socials: RadioCultPublicStation['socials'],
): ExternalIdentifier[] {
	const identifiers: ExternalIdentifier[] = [];
	if (socials?.instagramHandle) {
		identifiers.push({
			authorityUri: 'https://www.instagram.com/',
			value: socials.instagramHandle,
			kind: 'social',
			uri: `https://www.instagram.com/${socials.instagramHandle}/`,
		});
	}
	if (socials?.facebook) {
		identifiers.push({
			authorityUri: 'https://www.facebook.com/',
			value: socials.facebook,
			kind: 'social',
			uri: `https://www.facebook.com/${socials.facebook}/`,
		});
	}
	return identifiers;
}

export function createFallbackStation(
	stationId: string,
	label = stationId,
): Station {
	const resourceUri = `https://app.radiocult.fm/embed/square-player/${encodeURIComponent(stationId)}`;
	return {
		uri: resourceUri,
		label,
		...parseBroadcastIdentity(label),
		identifiers: [
			{
				authorityUri: RADIOCULT_URI,
				value: stationId,
				kind: 'slug',
				uri: resourceUri,
			},
		],
	};
}

export function parseRadioCultStation(
	stationId: string,
	response: unknown,
): Station {
	const data =
		response && typeof response === 'object' && 'station' in response
			? (response as RadioCultResponse).station
			: undefined;
	if (!data) {
		return createFallbackStation(stationId);
	}

	const channel = data.channels?.[0];
	const label = data.name || channel?.name || stationId;
	const resourceUri = `https://app.radiocult.fm/embed/square-player/${encodeURIComponent(stationId)}`;
	const homepageUri = normalizeUri(data.socials?.site);
	const streamUri = normalizeUri(
		channel?.streamingUrl || channel?.stream_url,
	);

	return {
		uri: homepageUri || resourceUri,
		label,
		name: channel?.name,
		description: data.description,
		artworkUri: normalizeUri(data.artwork),
		streamUri,
		countries: data.country?.filter((country) => country.length > 0),
		...parseBroadcastIdentity(`${label} ${data.description || ''}`),
		identifiers: [
			{
				authorityUri: RADIOCULT_URI,
				value: data.id || stationId,
				kind: 'slug',
				uri: resourceUri,
			},
			...socialIdentifiers(data.socials),
		],
	};
}
