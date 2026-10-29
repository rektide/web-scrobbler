import type { Station } from '@/core/types';

const SPINITRON_URI = 'https://spinitron.com/';

function getStationSlug() {
	const { host, pathname, searchParams } = window.location;
	if (host === 'widgets.spinitron.com') {
		return searchParams.get('station')?.toUpperCase() ?? null;
	}

	// Station pages are spinitron.com/<slug>/...; other paths simply have no
	// track state to report.
	const slug = pathname.match(/^\/([A-Za-z0-9-]+?)(?:\/|$)/)?.[1];
	return slug ? slug.toUpperCase() : null;
}

function getStation(): Station | null {
	const slug = getStationSlug();
	if (!slug) {
		return null;
	}

	const uri = `https://spinitron.com/${slug}/`;
	// Station pages expose "Slug – tagline" in <title>; widget pages just say
	// "Spinitron", so fall back to the slug there.
	const title = document.title.split('–')[0]?.trim();
	const label =
		document.title !== 'Spinitron' && title ? title : slug;

	return {
		uri,
		label,
		...(slug.match(/^[A-Z]{3,4}$/) ? { callSign: slug } : {}),
		identifiers: [
			{
				authorityUri: SPINITRON_URI,
				value: slug,
				kind: 'slug',
				uri,
			},
		],
	};
}

const station = getStation();

// Both station pages and now-playing widgets render the current playlist into
// the same #public-spins-N container, newest spin first; the pages themselves
// do not live-update, so observe the spins region and rely on reloads.
Connector.playerSelector = '#public-spins-0';

Connector.artistSelector = `${Connector.playerSelector} .spin .artist`;

Connector.trackSelector = `${Connector.playerSelector} .spin .song`;

Connector.trackArtSelector = `${Connector.playerSelector} .spin-art-container img`;

// These surfaces are metadata-only: spins have no <audio> element, just
// optional Apple Music preview buttons. Following the dnalounge precedent,
// report playing only while the tab is actually audible; for embedded widgets
// this also covers the host station's own player in a sibling frame.
Connector.useTabAudibleApi();

Connector.getChannelId = getStationSlug;

Connector.getStation = () => {
	return station;
};

Connector.getChannelLabel = () => {
	return station?.label ?? getStationSlug();
};

Connector.getOriginUrl = () => {
	return Connector.topLevelUrl || document.referrer || window.location.href;
};
