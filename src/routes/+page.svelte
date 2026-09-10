<script lang="ts">
	import AnimatedList from '$lib/AnimatedList.svelte';
	import Modal from '$lib/Modal.svelte';
	import SignalCard from '../demo/SignalCard.svelte';
	import { clock, relativeTime } from '../demo/clock.svelte';
	import {
		createSignal,
		seedSignals,
		SEVERITY_LABEL,
		SORTS,
		sortSignals,
		type Signal,
		type SortKey
	} from '../demo/data';
	import { dof } from '$lib/motion/transitions.js';

	const MAX_LIVE = 12;

	let signals = $state<Signal[]>(seedSignals(6));
	let sortKey = $state<SortKey>('score');
	let live = $state(false);

	const sorted = $derived(sortSignals(signals, sortKey));

	let aboutOpen = $state(false);
	let confirmOpen = $state(false);
	let detailOpen = $state(false);
	// Deliberately never reset: the dialog keeps its contents while it fades
	// out, so nothing blanks mid-transition.
	let detailSignal = $state<Signal | null>(null);

	function add() {
		signals = [...signals, createSignal()];
	}

	function dismiss(signal: Signal) {
		signals = signals.filter((s) => s.id !== signal.id);
	}

	function openDetail(signal: Signal) {
		detailSignal = signal;
		detailOpen = true;
	}

	function clearAll() {
		signals = [];
		confirmOpen = false;
	}

	// The live feed is the honest test: additions and removals arrive while
	// the list is mid-animation, and nothing is allowed to snap.
	$effect(() => {
		if (!live) return;
		const timer = setInterval(() => {
			const next = [...signals, createSignal()];
			signals = next.length > MAX_LIVE ? next.slice(next.length - MAX_LIVE) : next;
		}, 2400);
		return () => clearInterval(timer);
	});
</script>

<main class="shell">
	<section class="stage">
		<p class="kicker">SvelteKit · CSS motion lab</p>
		<h1>Rack focus</h1>
		<p class="lede">
			Two studies in continuity. Dialogs arrive through the focal plane — from
			<strong>100px</strong> of blur and nothing at all — while the page behind them racks out to
			<strong>10px</strong> under a soft vignette. The feed alongside measures itself, so a card
			can leave without its neighbours ever jumping.
		</p>

		<div class="actions">
			<button class="btn btn--primary" type="button" onclick={() => (aboutOpen = true)}>
				Open the dialog
			</button>
			<button class="btn" type="button" onclick={add}>Add a signal</button>
			<button
				class="btn btn--danger"
				type="button"
				onclick={() => (confirmOpen = true)}
				disabled={signals.length === 0}
			>
				Clear the feed
			</button>
		</div>

		<dl class="notes">
			<div>
				<dt>Modal</dt>
				<dd>
					Blur, opacity and scale run on three different curves, so the dialog becomes solid before
					it becomes sharp.
				</dd>
			</div>
			<div>
				<dt>List</dt>
				<dd>
					Cards are absolutely positioned from measured heights — every card here is a different
					size. A departing card leaves the layout instantly and fades where it stood.
				</dd>
			</div>
			<div>
				<dt>Rule</dt>
				<dd>Nothing appears or disappears. Everything interpolates.</dd>
			</div>
		</dl>
	</section>

	<section class="feed" aria-label="Signal feed">
		<header class="feed-head">
			<div class="feed-title">
				<h2>Signals</h2>
				<span class="count">{signals.length}</span>
			</div>

			<div class="feed-tools">
				<label class="select">
					<span class="sr-only">Sort by</span>
					<select bind:value={sortKey}>
						{#each SORTS as option (option.key)}
							<option value={option.key}>{option.label}</option>
						{/each}
					</select>
				</label>

				<button
					class="toggle"
					type="button"
					role="switch"
					aria-checked={live}
					onclick={() => (live = !live)}
				>
					<span class="pip" aria-hidden="true"></span>
					Live
				</button>
			</div>
		</header>

		<div class="scroller">
			<AnimatedList items={sorted}>
				{#snippet children(signal: Signal)}
					<SignalCard {signal} onopen={openDetail} ondismiss={dismiss} />
				{/snippet}
			</AnimatedList>

			{#if signals.length === 0}
				<p class="empty" in:dof={{ blur: 26, scale: 0.96, duration: 520 }} out:dof={{ blur: 20, duration: 300 }}>
					Nothing in the feed.<br />
					<button class="btn btn--ghost" type="button" onclick={() => (signals = seedSignals(6))}>
						Repopulate
					</button>
				</p>
			{/if}
		</div>
	</section>
</main>

<!-- ------------------------------------------------------------------ -->

<Modal bind:open={aboutOpen} eyebrow="Depth of field" title="How this dialog arrives" width="36rem">
	<p>
		The backdrop is the camera. It blurs everything behind it to 10px, pulls a third of the
		saturation and light out of the frame, and lays a vignette over the top — all interpolated from
		zero, never switched on.
	</p>
	<p>
		The dialog itself travels through the focal plane. It starts fully transparent at 100px of blur
		and 1.045× scale, and each property resolves on its own curve: opacity is most of the way home
		by the time the blur has really begun to clear. Leaving, it does the opposite — it holds its
		shape, falls back to 0.965×, and smears out.
	</p>

	{#snippet footer()}
		<button class="btn btn--primary" type="button" onclick={() => (aboutOpen = false)}>Close</button>
		<button class="btn btn--ghost" type="button" onclick={() => (aboutOpen = false)}>Close</button>
		<button class="btn btn--ghost" type="button" onclick={() => (aboutOpen = false)}>Close</button>
		<button class="btn btn--ghost" type="button" onclick={() => (aboutOpen = false)}>Close</button>
		<button class="btn btn--primary" type="button" onclick={() => (aboutOpen = false)}>
			Understood
		</button>
	{/snippet}
</Modal>

<Modal bind:open={confirmOpen} eyebrow="Confirm" title="Clear the feed?" width="26rem">
	<p>
		All {signals.length} signals will fade out together, and the panel will close its own height under
		the same curve.
	</p>

	{#snippet footer()}
		<button class="btn btn--ghost" type="button" onclick={() => (confirmOpen = false)}>
			Cancel
		</button>
		<button class="btn btn--danger" type="button" onclick={clearAll}>Clear everything</button>
	{/snippet}
</Modal>

<Modal
	bind:open={detailOpen}
	eyebrow={detailSignal ? SEVERITY_LABEL[detailSignal.severity] : undefined}
	title={detailSignal?.title}
	width="30rem"
>
	{#if detailSignal}
		<p class="detail-meta">
			{detailSignal.source} · {relativeTime(detailSignal.at, clock.current)} · confidence
			{detailSignal.score}
		</p>
		<p>{detailSignal.note}</p>
	{/if}

	{#snippet footer()}
		<button class="btn btn--ghost" type="button" onclick={() => (detailOpen = false)}>Close</button>
		<button
			class="btn btn--danger"
			type="button"
			onclick={() => {
				if (detailSignal) dismiss(detailSignal);
				detailOpen = false;
			}}
		>
			Dismiss signal
		</button>
	{/snippet}
</Modal>

<style>
	.shell {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 25rem);
		gap: clamp(1.25rem, 3vw, 3rem);
		height: 100dvh;
		padding: clamp(1.25rem, 3.2vw, 3rem);
	}

	.stage {
		align-self: center;
		max-width: 34rem;
		padding-bottom: 2rem;
	}

	.kicker {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	h1 {
		margin: 0.6rem 0 1rem;
		font-size: clamp(2.4rem, 6vw, 3.75rem);
		font-weight: 620;
		letter-spacing: -0.035em;
		background: linear-gradient(120deg, #ffffff 20%, #9fb6e8 75%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.lede {
		max-width: 32rem;
		color: var(--text-dim);
		font-size: 1.02rem;
	}

	.lede strong {
		color: var(--text);
		font-weight: 560;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 1.7rem 0 2.2rem;
	}

	.actions .btn[disabled] {
		opacity: 0.4;
		pointer-events: none;
	}

	.notes {
		display: grid;
		gap: 0.9rem;
		margin: 0;
		padding-top: 1.4rem;
		border-top: 1px solid var(--line);
	}

	.notes > div {
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1fr);
		gap: 1rem;
	}

	dt {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-faint);
		padding-top: 0.15rem;
	}

	dd {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-dim);
	}

	/* --- the feed panel --------------------------------------------- */

	.feed {
		display: flex;
		flex-direction: column;
		min-height: 0;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: linear-gradient(170deg, rgba(255, 255, 255, 0.05), rgba(8, 10, 16, 0.42));
		backdrop-filter: blur(22px) saturate(1.2);
		box-shadow: 0 30px 70px -40px rgba(0, 0, 0, 1);
		overflow: hidden;
	}

	.feed-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.1rem;
		border-bottom: 1px solid var(--line);
	}

	.feed-title {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
	}

	.feed-title h2 {
		font-size: 0.95rem;
		letter-spacing: 0.01em;
	}

	.count {
		min-width: 1.4rem;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: var(--surface);
		text-align: center;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--text-dim);
	}

	.feed-tools {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.select select {
		appearance: none;
		padding: 0.34rem 1.5rem 0.34rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236b7488' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E")
			no-repeat right 0.6rem center / 9px;
		background-color: transparent;
		color: var(--text-dim);
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		transition:
			border-color var(--dur-tint) var(--ease-out-quint),
			color var(--dur-tint) var(--ease-out-quint);
	}

	.select select:hover {
		border-color: var(--line-strong);
		color: var(--text);
	}

	.select option {
		background: var(--bg-elev);
		color: var(--text);
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.34rem 0.7rem 0.34rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: transparent;
		color: var(--text-faint);
		font-size: 0.78rem;
		cursor: pointer;
		transition:
			color var(--dur-tint) var(--ease-out-quint),
			border-color var(--dur-tint) var(--ease-out-quint),
			background var(--dur-tint) var(--ease-out-quint);
	}

	.toggle .pip {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		transition:
			background var(--dur-tint) var(--ease-out-quint),
			box-shadow var(--dur-tint) var(--ease-out-quint);
	}

	.toggle[aria-checked='true'] {
		color: var(--accent-mint);
		border-color: color-mix(in oklab, var(--accent-mint) 40%, transparent);
		background: color-mix(in oklab, var(--accent-mint) 10%, transparent);
	}

	.toggle[aria-checked='true'] .pip {
		box-shadow: 0 0 10px 1px currentColor;
	}

	.scroller {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 1rem 1.05rem 1.6rem;
		/* Cards dissolve into the panel edges instead of being sliced off by
		   them -- the same rule as everything else here, applied to scroll. */
		mask-image: linear-gradient(
			to bottom,
			transparent 0,
			#000 14px,
			#000 calc(100% - 22px),
			transparent 100%
		);
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
	}

	.scroller::-webkit-scrollbar {
		width: 8px;
	}

	.scroller::-webkit-scrollbar-thumb {
		border: 2px solid transparent;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.16) padding-box;
	}

	.empty {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.9rem;
		color: var(--text-faint);
		font-size: 0.875rem;
		text-align: center;
	}

	.detail-meta {
		margin-bottom: 0.7rem;
		font-size: 0.78rem;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/*
	 * When the shell can no longer be a fixed-height app frame, the document
	 * scrolls instead (see app.css) and the feed stops being its own scroll
	 * region -- two nested scrollers with a tall hero above them is a worse
	 * experience than one honest page scroll.
	 */
	@media (max-width: 900px), (max-height: 40rem) {
		.shell {
			height: auto;
			min-height: 100dvh;
		}

		.feed {
			min-height: 0;
		}

		.scroller {
			flex: none;
			overflow: visible;
			min-height: 12rem;
			mask-image: none;
		}
	}

	@media (max-width: 900px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
		}

		.stage {
			align-self: start;
			padding-bottom: 0;
		}
	}

	/* Narrow phones: let the dense rows wrap rather than overflow sideways. */
	@media (max-width: 26rem) {
		.feed-head {
			flex-wrap: wrap;
		}
	}
</style>
