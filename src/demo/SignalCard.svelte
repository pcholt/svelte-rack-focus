<script lang="ts">
	import { clock, relativeTime } from './clock.svelte';
	import { SEVERITY_LABEL, type Signal } from './data';

	interface Props {
		signal: Signal;
		onopen?: (signal: Signal) => void;
		ondismiss?: (signal: Signal) => void;
	}

	let { signal, onopen, ondismiss }: Props = $props();

	const when = $derived(relativeTime(signal.at, clock.current));
</script>

<article class="card" data-severity={signal.severity}>
	<span class="rail" aria-hidden="true"></span>

	<div class="top">
		<button class="title" type="button" onclick={() => onopen?.(signal)}>
			{signal.title}
		</button>

		<button
			class="dismiss"
			type="button"
			onclick={() => ondismiss?.(signal)}
			aria-label="Dismiss {signal.title}"
		>
			<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
				<path
					d="M4 4l8 8M12 4l-8 8"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>

	<p class="meta">
		<span class="badge">{SEVERITY_LABEL[signal.severity]}</span>
		<span class="source">{signal.source}</span>
		<span class="sep" aria-hidden="true">·</span>
		<span>{when}</span>
	</p>

	<p class="note">{signal.note}</p>

	<div class="meter" role="img" aria-label="Confidence {signal.score} of 100">
		<span style:width="{signal.score}%"></span>
	</div>
</article>

<style>
	.card {
		position: relative;
		overflow: hidden;
		padding: 0.95rem 1rem 0.95rem 1.15rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
		/* Opaque enough that two cards crossing each other mid-sort read as
		   one passing behind the other, rather than as a smear. */
		background:
			linear-gradient(150deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.022)),
			linear-gradient(180deg, rgba(17, 21, 31, 0.88), rgba(13, 16, 24, 0.92));
		backdrop-filter: blur(14px) saturate(1.25);
		box-shadow: 0 14px 34px -22px rgba(0, 0, 0, 0.95);
		transition:
			border-color var(--dur-tint) var(--ease-out-quint),
			background var(--dur-tint) var(--ease-out-quint),
			box-shadow var(--dur-tint) var(--ease-out-quint);
	}

	.card:hover {
		border-color: var(--line-strong);
		background:
			linear-gradient(150deg, rgba(255, 255, 255, 0.095), rgba(255, 255, 255, 0.035)),
			linear-gradient(180deg, rgba(20, 25, 37, 0.9), rgba(15, 19, 28, 0.94));
		box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 1);
	}

	.rail {
		position: absolute;
		top: 0.85rem;
		bottom: 0.85rem;
		left: 0;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: var(--tone);
		box-shadow: 0 0 14px -1px var(--tone);
	}

	.card[data-severity='critical'] {
		--tone: var(--danger);
	}
	.card[data-severity='warning'] {
		--tone: var(--accent-warm);
	}
	.card[data-severity='info'] {
		--tone: var(--accent);
	}
	.card[data-severity='stable'] {
		--tone: var(--accent-mint);
	}

	.top {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
	}

	.title {
		flex: 1;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
		font-size: 0.945rem;
		font-weight: 560;
		letter-spacing: -0.01em;
		line-height: 1.35;
		cursor: pointer;
		transition: color var(--dur-tint) var(--ease-out-quint);
	}

	.title:hover {
		color: var(--tone);
	}

	.dismiss {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		margin: -0.15rem -0.2rem 0 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--text-faint);
		cursor: pointer;
		/* Fades rather than appears -- nothing in this lab pops in. */
		opacity: 0;
		transition:
			opacity var(--dur-tint) var(--ease-out-quint),
			color var(--dur-tint) var(--ease-out-quint),
			background var(--dur-tint) var(--ease-out-quint);
	}

	.card:hover .dismiss,
	.dismiss:focus-visible {
		opacity: 1;
	}

	.dismiss:hover {
		color: var(--danger);
		background: rgba(255, 122, 138, 0.14);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.5rem;
		font-size: 0.755rem;
		color: var(--text-faint);
	}

	.badge {
		padding: 0.1rem 0.45rem;
		border: 1px solid color-mix(in oklab, var(--tone) 45%, transparent);
		border-radius: 999px;
		color: var(--tone);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.source {
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.sep {
		opacity: 0.5;
	}

	.note {
		margin-top: 0.55rem;
		font-size: 0.815rem;
		line-height: 1.5;
		color: var(--text-dim);
	}

	.meter {
		height: 3px;
		margin-top: 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.07);
		overflow: hidden;
	}

	.meter span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, color-mix(in oklab, var(--tone) 45%, transparent), var(--tone));
		/* A score change slides; it never snaps. */
		transition: width var(--dur-move) var(--ease-out-quint);
	}
</style>
