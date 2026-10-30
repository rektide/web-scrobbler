import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as lifecycle from '@/core/content/page-lifecycle';
import { retryUntil, runWithCleanup } from '@/core/content/page-lifecycle';

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
			'retryUntil',
			'runWithCleanup',
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

describe('retryUntil and its private leading/trailing throttle', () => {
	it('attempts immediately and observes only body child-list mutations', () => {
		const attempt = vi.fn().mockReturnValue(false);
		retryUntil(attempt, 100);
		expect(attempt).toHaveBeenCalledTimes(1);
		expect(observers[0].observe).toHaveBeenCalledWith(document.body, {
			childList: true,
			subtree: true,
		});
		expect(vi.getTimerCount()).toBe(0);
	});

	it('runs a leading attempt when the interval has elapsed, including its boundary', () => {
		const attempt = vi.fn().mockReturnValue(false);
		retryUntil(attempt, 100);
		vi.advanceTimersByTime(100);
		observers[0].mutate();
		expect(attempt).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(101);
		observers[0].mutate();
		expect(attempt).toHaveBeenCalledTimes(3);
	});

	it('coalesces one trailing attempt at window close without extending it for a burst', () => {
		const times: number[] = [];
		retryUntil(() => {
			times.push(Date.now());
			return false;
		}, 100);
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
		const attempt = vi.fn().mockReturnValue(false);
		retryUntil(attempt, 100);
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		vi.setSystemTime(Date.now() + 200);
		observers[0].mutate();
		expect(attempt).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(2);
	});

	it('disconnects immediately on initial success', () => {
		const attempt = vi.fn().mockReturnValue(true);
		retryUntil(attempt, 100);
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		observers[0].mutate();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(1);
	});

	it('disconnects on trailing success and schedules no more attempts', () => {
		const attempt = vi
			.fn()
			.mockReturnValueOnce(false)
			.mockReturnValue(true);
		retryUntil(attempt, 100);
		vi.advanceTimersByTime(20);
		observers[0].mutate();
		vi.advanceTimersByTime(80);
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		observers[0].mutate();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('stops mutation-driven retries on external generation cleanup', () => {
		const attempt = vi.fn().mockReturnValue(false);
		runWithCleanup(() => retryUntil(attempt, 100));
		window.cleanup?.();
		expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
		observers[0].mutate();
		vi.advanceTimersByTime(1000);
		expect(attempt).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('allows one queued trailing attempt after disconnect, but no retry loop', () => {
		const attempt = vi.fn().mockReturnValue(false);
		const stop = retryUntil(attempt, 100);
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
});
