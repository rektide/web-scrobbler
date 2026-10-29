export {};

const filter = MetadataFilter.createFilter({
	artist: MetadataFilter.replaceSmartQuotes,
	track: MetadataFilter.replaceSmartQuotes,
	album: MetadataFilter.replaceSmartQuotes,
});

/*
 * radio.co's embed player has two DOM generations:
 *
 * - Legacy: `.radioco-player` with semantic `.track-name`, `.track-artist`
 *   and `.current-artwork` classes. Kept as fallbacks since stations may
 *   run older generations elsewhere.
 * - Current (2026): a Mantine/React app with build-hashed CSS-module
 *   classes, e.g. `MediumPlayerWidget_medium-player__wrapper__C7_Zx`.
 *   Hashes are stable across stations and reloads, but churn on every
 *   radio.co deploy, so these selectors match class name prefixes via
 *   `[class*=]` and must never use full hashed names. Verified on the
 *   Classic/Medium player only; radio.co also documents Small and Large
 *   sizes and an Artwork type whose class trees are unverified.
 */

// Current generation: presence hook and artwork image (iTunes CDN URL).
const currentWrapper = '[class*="MediumPlayerWidget_medium-player__wrapper"]';
const currentArtwork = '[class*="MediumPlayerWidget_medium-player__image"]';
const currentNotPlaying =
	'[class*="MediumPlayerWidget_medium-player__wrapper--not-playing"]';

/*
 * Current generation: the panel renders two identical ScrollingText rows
 * with no semantic class distinction; the contract is positional — in
 * document order, row 1 is the track and row 2 the artist (verified on
 * three stations). Only `__text` spans are read; the `__measure` spans
 * are measurement clones that duplicate every string.
 */
const scrollingTextSpan = '[class*="ScrollingText_scrolling-text__text"]';

// Legacy generation selectors.
const legacyPlayer = '.radioco-player';
const legacyTrack = '.track-name';
const legacyArtist = '.track-artist';
const legacyArtwork = '.current-artwork';

function getScrollingTextRow(row: number): string {
	const rows = document.querySelectorAll(scrollingTextSpan);
	return rows[row]?.textContent?.trim() ?? '';
}

Connector.playerSelector = [currentWrapper, legacyPlayer];

// Row 1 of the ScrollingText rows is the track; Util.getTextFromSelectors
// returns the first matching element, so the plain span selector covers the
// current generation and falls back to the legacy class on old players.
Connector.trackSelector = [scrollingTextSpan, legacyTrack];

// CSS cannot select "the second match in document order", so the artist
// (ScrollingText row 2) needs a positional getter, with the legacy class
// as fallback.
Connector.getArtist = () =>
	getScrollingTextRow(1) || Util.getTextFromSelectors(legacyArtist);

Connector.trackArtSelector = [currentArtwork, legacyArtwork];

Connector.isPlaying = () => {
	// Current generation: prefer the audio element's state — the play
	// button's class never toggles, so it cannot signal playback state.
	const audio = document.querySelector('audio');
	if (audio) {
		return !audio.paused && !audio.ended;
	}

	// Current generation fallback: the wrapper carries a --not-playing
	// modifier class exactly while paused.
	if (Util.queryElements(currentWrapper)) {
		return Util.queryElements(currentNotPlaying) === null;
	}

	// Legacy generation.
	if (Util.queryElements(legacyPlayer)) {
		return Util.hasElementClass(legacyPlayer, 'playing');
	}

	return null;
};

Connector.applyFilter(filter);
