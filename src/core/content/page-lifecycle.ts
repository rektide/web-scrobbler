/**
 * Shared lifecycle helpers for page-world connector scripts
 * (`*dom-inject*.ts` files injected into the page itself).
 *
 * This module is a leaf with no extension API references, so it can be
 * bundled into page-world scripts, which run without the isolated-world
 * globals (`Connector`, `Util`, etc.). esbuild inlines it into every
 * connector entry that imports it.
 */

/**
 * Print a debug message with a `web-scrobbler` prefix.
 *
 * Page-world scripts cannot use the isolated-world `Util.debugLog`, which
 * reads extension storage; this is the page-world equivalent.
 * @param message - Debug message
 * @param level - Console level to print with
 */
export function debugLog(message: string, level: 'log' | 'warn' = 'log'): void {
	console[level](`web-scrobbler: ${message}`);
}

/**
 * Run a script generation: clean up the previous generation, if any, and
 * install the cleanup function returned by `setup` as `window.cleanup` for
 * the next generation.
 *
 * Extension reloads and updates re-inject page-world scripts; this
 * generation contract lets each generation undo the previous one's
 * observers, listeners, and timers.
 * @param setup - Sets up this generation and returns its cleanup function
 */
export function runWithCleanup(setup: () => () => void): void {
	const w = window as unknown as { cleanup?: () => void };

	if (typeof w.cleanup === 'function') {
		w.cleanup();
	}

	w.cleanup = setup();
}

/**
 * Create a leading-plus-trailing throttle around `fn`.
 *
 * Run immediately when the window has elapsed; otherwise schedule one
 * trailing run. A pending trailing run cannot be cancelled.
 * @param fn - Function to execute
 * @param interval - Minimum milliseconds between executions
 * @returns Function that requests an execution
 */
export function throttle(fn: () => void, interval: number): () => void {
	let lastRun = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	// Also the trailing callback: clearing the stale handle reopens
	// scheduling for the next burst.
	function execute() {
		lastRun = Date.now();

		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}

		fn();
	}

	return function runThrottle() {
		const remaining = interval - (Date.now() - lastRun);

		// Trailing edge: the window is still open, so schedule this
		// burst's closing run and wait for it.
		if (remaining > 0) {
			if (timer === null) {
				timer = setTimeout(execute, remaining);
			}
			return;
		}

		// Leading edge: the window has elapsed, so run now.
		execute();
	};
}

/**
 * Run `attempt` immediately and on body child list mutations until it
 * returns true. A pending trailing attempt can still run after disconnect.
 * @param attempt - Action to retry; returns true on success
 * @param interval - Minimum milliseconds between attempts
 * @returns Function that disconnects the retry observer
 */
export function retryUntil(
	attempt: () => boolean,
	interval: number,
): () => void {
	const runThrottle = throttle(function tryOnce() {
		if (attempt()) {
			retryObserver.disconnect();
		}
	}, interval);

	const retryObserver = new MutationObserver(runThrottle);

	retryObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});
	runThrottle();

	return retryObserver.disconnect.bind(retryObserver);
}
