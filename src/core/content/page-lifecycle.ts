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
function throttle(fn: () => void, interval: number): () => void {
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

/** Subscribe to wake-ups and return an unsubscribe function. */
export type RetrySource = (notify: () => void) => () => void;

/**
 * Create a source of throttled child-list mutation notifications.
 * Observation starts only when subscribed; the first mutation can notify
 * immediately. Unsubscribing disconnects observation, not a queued trailing run.
 * @param target - Node whose descendants may change
 * @param interval - Minimum milliseconds between notifications
 * @returns Notification source
 */
export function onMutations(target: Node, interval: number): RetrySource {
	return (notify) => {
		const observer = new MutationObserver(throttle(notify, interval));
		observer.observe(target, { childList: true, subtree: true });
		return observer.disconnect.bind(observer);
	};
}

/**
 * Create a periodic notification source, started only when subscribed.
 * @param interval - Milliseconds between notifications
 * @returns Notification source
 */
export function every(interval: number): RetrySource {
	return (notify) => {
		const timer = setInterval(notify, interval);
		return () => clearInterval(timer);
	};
}

/**
 * Attempt immediately, then on source notifications until finished or disposed.
 * The source is not activated if the immediate attempt finishes. Late callbacks
 * are ignored, including trailing mutation notifications after disposal.
 * @param attempt - Action to retry; true means no more attempts are needed
 * @param source - Wake-ups to subscribe to after an unsuccessful first attempt
 * @returns Idempotent function that stops attempts and unsubscribes
 */
export function untilReady(
	attempt: () => boolean,
	source: RetrySource,
): () => void {
	let stopped = false;
	let unsubscribe: (() => void) | undefined;

	function dispose() {
		if (stopped) {
			return;
		}
		stopped = true;
		unsubscribe?.();
	}

	function tryOnce() {
		if (stopped) {
			return;
		}
		if (attempt()) {
			dispose();
		}
	}

	tryOnce();
	if (!stopped) {
		unsubscribe = source(tryOnce);
		// A source may notify synchronously before returning its unsubscribe.
		if (stopped) {
			unsubscribe();
		}
	}
	return dispose;
}
