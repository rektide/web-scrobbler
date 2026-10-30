import {
	every,
	runWithCleanup,
	untilReady,
} from '@/core/content/page-lifecycle';

enum State {
	Waiting = 'WAITING',
	Rejected = 'REJECTED',
	Accepted = 'ACCEPTED',
	Confirmed = 'CONFIRMED',
}

declare global {
	interface Window {
		wsState: () => State;
		setWSState: (newState: State) => void;
	}
}

runWithCleanup(() => {
	const stopRetrying = untilReady(tryConfirm, every(1000));

	function tryConfirm() {
		if (
			typeof window.wsState !== 'function' ||
			window.wsState() !== State.Accepted
		) {
			return false;
		}

		const search = new URLSearchParams(window.location.search);
		window.postMessage(
			{
				sender: 'web-scrobbler',
				type: 'confirmLogin',
				applicationName: search.get('applicationName'),
				userApiUrl: search.get('userApiUrl'),
			},
			'*',
		);
		window.setWSState(State.Confirmed);
		return true;
	}

	return () => {
		stopRetrying();
	};
});
