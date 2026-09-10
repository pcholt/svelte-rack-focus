<script lang="ts" generics="T extends { id: string | number }">
	import { onDestroy, tick, untrack, type Snippet } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { BLUR, DURATION, EASE, REDUCED_DURATION } from './motion/tokens.js';

	/* ------------------------------------------------------------------
	   A list that owns its own layout.

	   The obvious implementation -- normal flow plus `animate:flip` -- has a
	   hole in it: a removed node keeps occupying space until its outro has
	   finished, so the surviving cards do not start closing the gap until
	   the very moment the node vanishes, and then they jump. This component
	   sidesteps that by measuring every item and positioning it absolutely.
	   Removing one takes it out of the layout calculation *immediately*
	   while its own fade-out plays on, so the gap closes in the same breath.

	   Items may be any height and any mix of heights; a ResizeObserver keeps
	   the stack correct when a height changes underneath it.

	   The three states an item can be in:
	     entering -- mounted straight at its final slot, fading up from blur
	     present  -- translating between slots under a CSS transition
	     leaving  -- excluded from layout, frozen in place, fading away
	   ------------------------------------------------------------------ */

	type Key = T['id'];
	type Phase = 'entering' | 'present' | 'leaving';

	interface Entry {
		key: Key;
		item: T;
		y: number;
		phase: Phase;
		/** Stagger, used only for the items present at first paint. */
		delay: number;
	}

	interface Props {
		/** The list, already in the order you want it displayed. */
		items: T[];
		/** Vertical space between items, in px. */
		gap?: number;
		/** Milliseconds for an item to slide to a new slot. */
		moveDuration?: number;
		/** Milliseconds for an item to fade in. */
		enterDuration?: number;
		/** Milliseconds for an item to fade out. */
		exitDuration?: number;
		/** Blur radius (px) an arriving item resolves from. */
		enterBlur?: number;
		/** Blur radius (px) a departing item smears out to. */
		exitBlur?: number;
		/** Per-item stagger (ms) applied only to the first paint. `0` disables. */
		stagger?: number;
		/** Cap on the accumulated first-paint stagger, in ms. */
		staggerMax?: number;
		/** Any CSS easing keyword or `cubic-bezier()`. */
		easing?: string;
		/** Extra class on the container element. */
		class?: string;
		children: Snippet<[T]>;
	}

	let {
		items,
		gap = 14,
		moveDuration = DURATION.move,
		enterDuration = DURATION.cardIn,
		exitDuration = DURATION.cardOut,
		enterBlur = BLUR.cardIn,
		exitBlur = BLUR.cardOut,
		stagger = 55,
		staggerMax = 660,
		easing = EASE.outQuint,
		class: className = '',
		children
	}: Props = $props();

	// Reduced motion is handled here rather than in a media query because the
	// timings are written as inline custom properties, which a stylesheet
	// cannot override -- and because the JS timers below have to agree with
	// whatever the CSS ends up doing.
	const reduce = $derived(typeof window !== 'undefined' && prefersReducedMotion.current);
	const moveMs = $derived(reduce ? REDUCED_DURATION : moveDuration);
	const enterMs = $derived(reduce ? REDUCED_DURATION : enterDuration);
	const exitMs = $derived(reduce ? REDUCED_DURATION : exitDuration);
	const enterBlurPx = $derived(reduce ? 0 : enterBlur);
	const exitBlurPx = $derived(reduce ? 0 : exitBlur);
	const enterScale = $derived(reduce ? 1 : 0.94);
	const exitScale = $derived(reduce ? 1 : 0.96);
	const staggerMs = $derived(reduce ? 0 : stagger);

	let entries = $state<Entry[]>([]);
	let deckHeight = $state(0);
	let firstPass = true;

	/** Live DOM nodes and their last measured heights, keyed by item id. */
	const nodes = new Map<Key, HTMLElement>();
	const sizes = new Map<Key, number>();
	const keyOf = new WeakMap<HTMLElement, Key>();
	const exitTimers = new Map<Key, ReturnType<typeof setTimeout>>();
	const enterTimers = new Map<Key, ReturnType<typeof setTimeout>>();

	let observer: ResizeObserver | undefined;

	/**
	 * Placeholder for an item that has not been measured yet -- only ever used
	 * for the initial `y` of items created in the same pass, which `layout()`
	 * corrects on the same frame, before paint. Items may be any height and
	 * any mix of heights; nothing here assumes they are uniform.
	 */
	function estimateHeight(): number {
		if (sizes.size === 0) return 96;
		let total = 0;
		for (const h of sizes.values()) total += h;
		return total / sizes.size;
	}

	function sizeOf(key: Key): number {
		return sizes.get(key) ?? nodes.get(key)?.offsetHeight ?? estimateHeight();
	}

	/**
	 * Reconcile `entries` against the incoming `items`.
	 *
	 * A newly added item is given its final `y` up front, computed from the
	 * items that precede it -- those heights are already known, and an item
	 * cannot displace anything above itself. So it mounts exactly where it
	 * belongs and only has to fade in. Everything below it discovers its new
	 * `y` a tick later, once the newcomer has been measured, and glides.
	 */
	function sync(next: T[]) {
		const previous = new Map<Key, Entry>();
		for (const entry of entries) previous.set(entry.key, entry);

		const result: Entry[] = [];
		const incoming = new Set<Key>();
		let cursor = 0;
		let index = 0;

		for (const item of next) {
			const key = item.id as Key;
			incoming.add(key);

			const existing = previous.get(key);
			if (existing) {
				existing.item = item;
				if (existing.phase === 'leaving') {
					// Re-added mid-exit: cancel the removal and let it settle back.
					clearTimeout(exitTimers.get(key));
					exitTimers.delete(key);
					existing.phase = 'entering';
					existing.y = cursor;
					scheduleSettle(existing);
				}
				result.push(existing);
			} else {
				const entry: Entry = {
					key,
					item,
					y: cursor,
					phase: 'entering',
					// The very first paint gets a gentle stagger; later arrivals
					// are single events and should be immediate.
					delay: firstPass ? Math.min(index * staggerMs, staggerMax) : 0
				};
				scheduleSettle(entry);
				result.push(entry);
			}

			cursor += sizeOf(key) + gap;
			index += 1;
		}

		// Anything that fell out of `items` starts leaving, but stays in the
		// DOM (and stays exactly where it was) until its fade has finished.
		for (const entry of entries) {
			if (incoming.has(entry.key)) continue;
			if (entry.phase !== 'leaving') {
				entry.phase = 'leaving';
				exitTimers.set(
					entry.key,
					setTimeout(() => purge(entry.key), exitMs + 60)
				);
			}
			result.push(entry);
		}

		entries = result;
		firstPass = false;
		void tick().then(layout);
	}

	function purge(key: Key) {
		exitTimers.delete(key);
		clearTimeout(enterTimers.get(key));
		enterTimers.delete(key);
		entries = entries.filter((entry) => entry.key !== key);
		void tick().then(layout);
	}

	/** Measure every live item and stack them. One reflow per pass. */
	function layout() {
		let cursor = 0;

		for (const entry of entries) {
			if (entry.phase === 'leaving') continue;

			const node = nodes.get(entry.key);
			if (node) sizes.set(entry.key, node.offsetHeight);

			if (entry.y !== cursor) entry.y = cursor;
			cursor += sizeOf(entry.key) + gap;
		}

		deckHeight = Math.max(0, cursor - gap);
	}

	/** Registers a slot node, and keeps it measured as its content reflows. */
	function slot(node: HTMLElement, key: Key) {
		nodes.set(key, node);
		keyOf.set(node, key);
		sizes.set(key, node.offsetHeight);
		observer?.observe(node);

		return {
			destroy() {
				observer?.unobserve(node);
				nodes.delete(key);
				sizes.delete(key);
			}
		};
	}

	function settle(entry: Entry) {
		clearTimeout(enterTimers.get(entry.key));
		enterTimers.delete(entry.key);
		if (entry.phase === 'entering') entry.phase = 'present';
	}

	function onAnimationEnd(event: AnimationEvent, entry: Entry) {
		// `animationend` bubbles; ignore anything an item's contents fire.
		if (event.target !== event.currentTarget) return;
		settle(entry);
	}

	/**
	 * Belt to the `animationend` braces. An entering item has its `translate`
	 * transition suppressed, so if the event were ever missed -- a throttled
	 * background tab is the usual way -- that item would stop gliding to new
	 * slots for good. A timer guarantees it graduates.
	 */
	function scheduleSettle(entry: Entry) {
		clearTimeout(enterTimers.get(entry.key));
		enterTimers.set(
			entry.key,
			setTimeout(() => settle(entry), enterMs + entry.delay + 90)
		);
	}

	$effect(() => {
		observer = new ResizeObserver((records) => {
			let dirty = false;
			for (const record of records) {
				const key = keyOf.get(record.target as HTMLElement);
				if (key === undefined) continue;
				const next = (record.target as HTMLElement).offsetHeight;
				if (sizes.get(key) !== next) {
					sizes.set(key, next);
					dirty = true;
				}
			}
			if (dirty) layout();
		});

		for (const node of nodes.values()) observer.observe(node);

		return () => {
			observer?.disconnect();
			observer = undefined;
		};
	});

	$effect(() => {
		const next = items;
		untrack(() => sync(next));
	});

	// Re-stack when the gap changes, without waiting for a list mutation.
	$effect(() => {
		gap;
		untrack(layout);
	});

	onDestroy(() => {
		for (const timer of exitTimers.values()) clearTimeout(timer);
		for (const timer of enterTimers.values()) clearTimeout(timer);
		exitTimers.clear();
		enterTimers.clear();
	});
</script>

<div
	class="rf-deck {className}"
	style:height="{deckHeight}px"
	style:--rf-move="{moveMs}ms"
	style:--rf-enter="{enterMs}ms"
	style:--rf-exit="{exitMs}ms"
	style:--rf-enter-blur="{enterBlurPx}px"
	style:--rf-exit-blur="{exitBlurPx}px"
	style:--rf-enter-scale={enterScale}
	style:--rf-exit-scale={exitScale}
	style:--rf-list-ease={easing}
>
	{#each entries as entry (entry.key)}
		<div
			class="rf-slot"
			data-phase={entry.phase}
			style:translate="0 {entry.y}px"
			style:--rf-enter-delay="{entry.delay}ms"
			use:slot={entry.key}
			onanimationend={(event) => onAnimationEnd(event, entry)}
		>
			{@render children(entry.item)}
		</div>
	{/each}
</div>

<style>
	.rf-deck {
		position: relative;
		/* The deck grows and shrinks under the same curve the items move
		   under, so a surrounding scroll area never snaps to a new size. */
		transition: height var(--rf-move) var(--rf-list-ease);
	}

	.rf-slot {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1;
		/* `translate` rather than `transform` so that the enter/exit keyframes
		   are free to animate `scale` without clobbering the position. */
		transition: translate var(--rf-move) var(--rf-list-ease);
		will-change: translate;
	}

	.rf-slot[data-phase='entering'] {
		/* An arriving item never glides -- it is mounted at its final slot and
		   only fades up. Suppressing the transition also keeps the first paint
		   clean, where positions are corrected once real heights are known. */
		transition: none;
		animation: rf-card-in var(--rf-enter) var(--rf-list-ease) var(--rf-enter-delay, 0ms) both;
	}

	.rf-slot[data-phase='leaving'] {
		z-index: 0;
		pointer-events: none;
		animation: rf-card-out var(--rf-exit) var(--rf-list-ease) both;
	}

	@keyframes rf-card-in {
		from {
			opacity: 0;
			scale: var(--rf-enter-scale);
			filter: blur(var(--rf-enter-blur));
		}
		55% {
			opacity: 1;
		}
		to {
			opacity: 1;
			scale: 1;
			filter: blur(0);
		}
	}

	@keyframes rf-card-out {
		from {
			opacity: 1;
			scale: 1;
			filter: blur(0);
		}
		to {
			opacity: 0;
			scale: var(--rf-exit-scale);
			filter: blur(var(--rf-exit-blur));
		}
	}
</style>
