import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as lifecycle from '@/core/content/page-lifecycle';
import {
	every,
	onMutations,
	runWithCleanup,
	untilReady,
} from '@/core/content/page-lifecycle';

const observers: TestMutationObserver[] = [];

class TestMutationObserver {
	callback: MutationCallback;
	connected = false;
	observe = vi.fn(() => {
		this.connected = true;
	});
	disconnect = vi.fn(() => {
		this.connected = false;
	});

	constructor(callback: MutationCallback) {
		this.callback = callback;
		observers.push(this);
	}

	mutate() {
		if (this.connected) {
			this.callback([], this as unknown as MutationObserver);
		}
	}
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
	observers.length = 0;
	vi.stubGlobal('MutationObserver', TestMutationObserver);
	vi.stubGlobal('document', { body: {} });
	vi.stubGlobal('window', {});
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('page-world lifecycle surface', () => {
	it('keeps the throttle private', () => {
		expect(Object.keys(lifecycle).sort()).toEqual([
			'debugLog',
			'every',
			'onMutations',
			'runWithCleanup',
			'untilReady',
		]);
	});

	it('cleans up the prior generation before running the next setup', () => {
		const cleanup = vi.fn();
		runWithCleanup(() => cleanup);
		const setup = vi.fn(() => vi.fn());
		runWithCleanup(setup);
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanup.mock.invocationCallOrder[0]).toBeLessThan(
			setup.mock.invocationCallOrder[0],
		);
	});
});

describe('notification sources', () => {
	it('keeps construction inert and observes only the subscribed target child-list', () => {
		const target = {} as Node;
		const source = onMutations(target, 100);
		const notify = vi.fn();
		every(100);
		expect(observers).toHaveLength(0);
		expect(vi.getTimerCount()).toBe(0);
		const unsubscribe = source(notify);
		expect(observers[0].observe).toHaveBeenCalledWith(target, {
			childList: true,
			subtree: true,
		});
		expect(notify).not.toHaveBeenCalled();
		observers[0].mutate();
		expect(notify).toHaveBeenCalledTimes(1);
		unsubscribe();
		expect(observers[0].connected).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('runs a leading notification when the interval has elapsed, including its boundary', () => {
		const notify = vi.fn();
		onMutations(document.body, 100)(notify);
		observers[0].mutate();
		vi.advanceTimersByTime(100);
		observers[0].mutate();
		expect(notify).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(101);
		observers[0].mutate();
		expect(notify).toHaveBeenCalledTimes(3);
	});

	it('coalesces one trailing notification at window close without extending it for a burst', () => {
		const times: number[] = [];
		onMutations(
			document.body,
			100,
		)(() => {
			times.push(Date.now());
		});
		observers[0].mutate();
		const start = times[0];
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		vi.advanceTimersByTime(59);
		observers[0].mutate();
		expect(times).toEqual([start]);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1);
		expect(times).toEqual([start, start + 100]);
		expect(vi.getTimerCount()).toBe(0);

		// A completed trailing callback reopens scheduling for the next burst.
		observers[0].mutate();
		vi.advanceTimersByTime(100);
		expect(times).toEqual([start, start + 100, start + 200]);
	});

	it('clears a delayed trailing timer when an elapsed leading call runs', () => {
		const notify = vi.fn();
		onMutations(document.body, 100)(notify);
		observers[0].mutate();
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		vi.setSystemTime(Date.now() + 200);
		observers[0].mutate();
		expect(notify).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(1000);
		expect(notify).toHaveBeenCalledTimes(2);
	});

	it('starts a poll on subscription, without an immediate or throttled notification', () => {
		const notify = vi.fn();
		const unsubscribe = every(100)(notify);
		expect(notify).not.toHaveBeenCalled();
		vi.advanceTimersByTime(99);
		expect(notify).not.toHaveBeenCalled();
		vi.advanceTimersByTime(201);
		expect(notify).toHaveBeenCalledTimes(3);
		unsubscribe();
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(1000);
		expect(notify).toHaveBeenCalledTimes(3);
	});
});

describe('untilReady', () => {
	it('attempts immediately without activating a source on initial success', () => {
		const attempt = vi.fn().mockReturnValue(true);
		const source = vi.fn(onMutations(document.body, 100));
		const dispose = untilReady(attempt, source);
		expect(source).not.toHaveBeenCalled();
		expect(observers).toHaveLength(0);
		dispose();
		dispose();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(1);
	});

	it('attempts immediately, then on mutation wake-ups, and disconnects on trailing success', () => {
		const attempt = vi
			.fn()
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(false)
			.mockReturnValue(true);
		const dispose = untilReady(attempt, onMutations(document.body, 100));
		expect(attempt).toHaveBeenCalledTimes(1);
		observers[0].mutate();
		expect(attempt).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		vi.advanceTimersByTime(80);
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		dispose();
		dispose();
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		observers[0].mutate();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(3);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('stops mutation-driven retries on external generation cleanup', () => {
		const attempt = vi.fn().mockReturnValue(false);
		runWithCleanup(() =>
			untilReady(attempt, onMutations(document.body, 100)),
		);
		window.cleanup?.();
		window.cleanup?.();
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		observers[0].mutate();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('suppresses an already queued trailing notification after disposal', () => {
		const attempt = vi.fn().mockReturnValue(false);
		const stop = untilReady(attempt, onMutations(document.body, 100));
		observers[0].mutate();
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		stop();
		expect(observers[0].connected).toBe(false);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(80);
		expect(attempt).toHaveBeenCalledTimes(2);
		observers[0].mutate();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('suppresses a queued trailing notification after another wake-up settles the wait', () => {
		const attempt = vi.fn().mockReturnValue(false);
		let notify: () => void = () => undefined;
		const mutations = onMutations(document.body, 100);
		untilReady(attempt, (callback) => {
			notify = callback;
			return mutations(callback);
		});
		observers[0].mutate();
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		attempt.mockReturnValue(true);
		notify();
		expect(attempt).toHaveBeenCalledTimes(3);
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(3);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('polls changing global readiness without DOM mutations and stops on success', () => {
		const attempt = vi.fn(() => 'sdk' in window);
		const dispose = untilReady(attempt, every(100));
		vi.advanceTimersByTime(200);
		expect(attempt).toHaveBeenCalledTimes(3);
		Object.assign(window, { sdk: {} });
		vi.advanceTimersByTime(100);
		expect(attempt).toHaveBeenCalledTimes(4);
		expect(vi.getTimerCount()).toBe(0);
		dispose();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(4);
		expect(observers).toHaveLength(0);
	});

	it('stops polling on disposal without running attempt side effects again', () => {
		const attempt = vi.fn().mockReturnValue(false);
		const dispose = untilReady(attempt, every(100));
		dispose();
		dispose();
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(1);
	});

	it('safely settles during synchronous subscription and unsubscribes exactly once', () => {
		const attempt = vi
			.fn()
			.mockReturnValueOnce(false)
			.mockReturnValue(true);
		const unsubscribe = vi.fn();
		const dispose = untilReady(attempt, (notify) => {
			notify();
			notify();
			return unsubscribe;
		});
		expect(attempt).toHaveBeenCalledTimes(2);
		expect(unsubscribe).toHaveBeenCalledTimes(1);
		dispose();
		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});

	it('ignores notifications delivered during unsubscribe or after disposal', () => {
		const attempt = vi.fn().mockReturnValue(false);
		let notify: () => void = () => undefined;
		const unsubscribe = vi.fn(() => notify());
		const dispose = untilReady(attempt, (callback) => {
			notify = callback;
			notify();
			return unsubscribe;
		});
		expect(attempt).toHaveBeenCalledTimes(2);
		dispose();
		notify();
		dispose();
		expect(attempt).toHaveBeenCalledTimes(2);
		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});
});
