import { For, Show, createResource, createSignal, onCleanup } from 'solid-js';
import browser from 'webextension-polyfill';
import scrobbleService from '@/core/object/scrobble-service';
import type AtProtoScrobbler from '@/core/scrobbler/atproto/atproto-scrobbler';
import { getOAuthAccount } from '@/core/scrobbler/atproto/oauth-client';
import { OAUTH_STORAGE_PREFIX } from '@/core/scrobbler/atproto/oauth-store';
import { AT_PROTO_LEXICONS } from '@/core/storage/wrapper';
import { sendContentMessage } from '@/util/communication';
import { t } from '@/util/i18n';
import styles from './components.module.scss';

export default function AtProtoAccount() {
	const scrobbler = scrobbleService.getScrobblerByLabel(
		'AtProto',
	) as AtProtoScrobbler;
	const [account, { refetch }] = createResource(async () => ({
		current: await getOAuthAccount(),
		legacy: await scrobbler.needsReauthorization(),
	}));
	const [identifier, setIdentifier] = createSignal('');
	const [busy, setBusy] = createSignal(false);
	const [waiting, setWaiting] = createSignal(false);
	const [error, setError] = createSignal('');
	const refresh = () => {
		void refetch();
	};
	const onStorage = (
		changes: Record<string, browser.Storage.StorageChange>,
		area: string,
	) => {
		if (
			area === 'local' &&
			Object.keys(changes).some(
				(key) =>
					key === 'AtProto' || key.startsWith(OAUTH_STORAGE_PREFIX),
			)
		) {
			refresh();
		}
	};
	browser.storage.onChanged.addListener(onStorage);
	window.addEventListener('focus', refresh);
	onCleanup(() => {
		browser.storage.onChanged.removeListener(onStorage);
		window.removeEventListener('focus', refresh);
	});

	const signIn = async () => {
		setBusy(true);
		setError('');
		try {
			if (
				!(await browser.permissions.contains({
					origins: ['https://*/'],
				}))
			) {
				setError(t('accountsAtProtoPermissions'));
				return;
			}
			const result = await sendContentMessage({
				type: 'atprotoAuthorize',
				payload: { identifier: identifier() },
			});
			if (!result.ok) {
				throw new Error('Authorization failed');
			}
			setWaiting(true);
		} catch {
			setError(t('accountsAtProtoAuthError'));
		} finally {
			setBusy(false);
		}
	};
	const signOut = async () => {
		setBusy(true);
		setError('');
		try {
			await scrobbler.signOut();
			setWaiting(false);
			await refetch();
		} catch {
			setError(t('accountsAtProtoSignOutError'));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div role="group" aria-label="AtProto">
			<h2>AtProto</h2>
			<Show when={!account.loading}>
				<Show
					when={account()?.current}
					fallback={
						<>
							<p>{t('accountsNotSignedIn')}</p>
							<Show when={account()?.legacy}>
								<p>{t('accountsAtProtoReauthorize')}</p>
							</Show>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									void signIn();
								}}
							>
								<label class={styles.propLabel}>
									{t('accountsAtProtoHandle')}
									<input
										class={styles.propInput}
										value={identifier()}
										required
										disabled={busy()}
										placeholder="you.bsky.social"
										autocomplete="off"
										onInput={(event) =>
											setIdentifier(
												event.currentTarget.value,
											)
										}
									/>
								</label>
								<button
									class={styles.button}
									type="submit"
									disabled={busy()}
								>
									{t('accountsSignIn')}
								</button>
							</form>
							<Show when={waiting()}>
								<p role="status">
									{t('accountsAtProtoWaiting')}
								</p>
							</Show>
						</>
					}
				>
					{(current) => (
						<>
							<p>{t('accountsSignedInAs', current().did)}</p>
							<div class={styles.buttonContainer}>
								<a
									class={styles.button}
									href={`https://bsky.app/profile/${current().did}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									{t('accountsProfile')}
								</a>
								<button
									class={styles.button}
									disabled={busy()}
									onClick={() => void signOut()}
								>
									{t('accountsSignOut')}
								</button>
							</div>
							<LexiconCheckboxes scrobbler={scrobbler} />
						</>
					)}
				</Show>
			</Show>
			<Show when={error() || account.error}>
				<p role="alert">{error() || t('accountsAtProtoAuthError')}</p>
			</Show>
		</div>
	);
}

function LexiconCheckboxes(props: { scrobbler: AtProtoScrobbler }) {
	const [lexicons, { refetch }] = createResource(() =>
		props.scrobbler.getEnabledLexicons(),
	);
	return (
		<div>
			<h3>{t('accountsAtProtoScrobbleTo')}</h3>
			<For each={AT_PROTO_LEXICONS}>
				{(lexicon) => (
					<label class={styles.propLabel}>
						<input
							type="checkbox"
							checked={lexicons()?.[lexicon.id] ?? true}
							onChange={(event) => {
								void props.scrobbler
									.setLexiconEnabled(
										lexicon.id,
										event.currentTarget.checked,
									)
									.then(() => refetch());
							}}
						/>
						{` ${lexicon.label}`}
					</label>
				)}
			</For>
		</div>
	);
}
