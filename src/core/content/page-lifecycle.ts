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
 * `run` executes `fn` immediately if at least `interval` milliseconds have
 * passed since the last execution; otherwise it schedules one trailing
 * execution, so a burst of calls produces at most one leading and one
 * trailing run. All time bookkeeping lives here; call sites never compute
 * durations.
 * @param fn - Function to execute
 * @param interval - Minimum milliseconds between executions
 * @returns Handle whose `run` requests an execution and whose `stop`
 * cancels any pending trailing execution; `stop` is safe in any state.
 */
export function throttle(
	fn: () => void,
	interval: number,
): { run: () => void; stop: () => void } {
	let lastRun = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const run = () => {
		lastRun = Date.now();
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		fn();
	};

	return {
		run: () => {
			const remaining = interval - (Date.now() - lastRun);

			// Leading edge: the window has elapsed, so run now.
			if (remaining <= 0) {
				run();
				return;
			}

			// Trailing edge: schedule this burst's closing run, once.
			if (timer === null) {
				timer = setTimeout(() => {
					timer = null;
					run();
				}, remaining);
			}
		},
		stop: () => {
			if (timer === null) {
				return;
			}
			clearTimeout(timer);
			timer = null;
		},
	};
}

/**
 * Run `attempt` immediately and on `document.body` child list mutations
 * until it succeeds. Attempts are throttled to at most one per `interval`,
 * with a trailing attempt per mutation burst so no burst is ever dropped.
 * @param attempt - Action to retry; returns true on success
 * @param interval - Minimum milliseconds between attempts
 * @returns Function that stops the retries and disconnects the observer
 */
export function retryUntil(
	attempt: () => boolean,
	interval: number,
): () => void {
	const throttled = throttle(() => {
		if (!attempt()) {
			return;
		}
		stop();
	}, interval);

	const stop = () => {
		retryObserver.disconnect();
		throttled.stop();
	};

	const retryObserver = new MutationObserver(() => {
		throttled.run();
	});

	retryObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});
	throttled.run();

	return stop;
}
