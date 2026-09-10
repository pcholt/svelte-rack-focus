<script lang="ts">
	import type { Snippet } from 'svelte';
	import { portal } from './motion/portal.js';
	import { lockScroll } from './motion/scroll-lock.js';
	import { trapFocus } from './motion/trap-focus.js';
	import { focusIn, focusOut, rack, rackStyle, type RackParams } from './motion/transitions.js';
	import { BLUR, DURATION } from './motion/tokens.js';

	interface Props {
		/** Two-way: `bind:open`. */
		open?: boolean;
		title?: string;
		/** Small line above the title. */
		eyebrow?: string;
		/** When false, Escape and backdrop clicks do not close the dialog. */
		dismissible?: boolean;
		/** Any CSS length; the dialog is `min(100%, width)`. */
		width?: string;
		/** Blur radius (px) the dialog travels through. */
		blur?: number;
		/** Milliseconds for the dialog's arrival. */
		duration?: number;
		/** Milliseconds for the dialog's departure. */
		exitDuration?: number;
		/** Backdrop appearance and timing — see `RackParams`. */
		backdrop?: RackParams;
		/** Where to portal the dialog. Defaults to `document.body`. */
		portalTo?: HTMLElement | string;
		/** Extra class on the dialog element. */
		class?: string;
		/** Use when you render your own heading instead of passing `title`. */
		labelledBy?: string;
		children?: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		eyebrow,
		dismissible = true,
		width = '34rem',
		blur = BLUR.modal,
		duration = DURATION.focus,
		exitDuration = DURATION.defocus,
		backdrop = {},
		portalTo = 'body',
		class: className = '',
		labelledBy,
		children,
		footer,
		onclose
	}: Props = $props();

	const titleId = `rf-modal-${Math.random().toString(36).slice(2, 9)}`;

	// The backdrop's settled appearance and its keyframes come from the same
	// function, so they cannot drift apart and snap at the end of the intro.
	const settled = $derived(rackStyle(backdrop, 1));

	function close() {
		if (!open) return;
		open = false;
		onclose?.();
	}

	function onkeydown(event: KeyboardEvent) {
		if (open && dismissible && event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	// Scroll lock and focus restoration go together: both are things the page
	// is owed back the moment the modal starts leaving.
	$effect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		const release = lockScroll();

		return () => {
			release();
			previous?.focus?.({ preventScroll: true });
		};
	});
</script>

<svelte:window {onkeydown} />

{#if open}
	<div class="rf-layer" use:portal={portalTo}>
		<div
			class="rf-backdrop"
			style:backdrop-filter={settled.filter}
			style:-webkit-backdrop-filter={settled.filter}
			style:background={settled.background}
			transition:rack={backdrop}
			onclick={() => dismissible && close()}
			aria-hidden="true"
		></div>

		<div
			class="rf-dialog {className}"
			style:--rf-dialog-width={width}
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
			tabindex="-1"
			use:trapFocus
			in:focusIn={{ blur, duration }}
			out:focusOut={{ blur, duration: exitDuration }}
		>
			{#if title || eyebrow || dismissible}
				<header class="rf-head">
					<div>
						{#if eyebrow}<p class="rf-eyebrow">{eyebrow}</p>{/if}
						{#if title}<h2 class="rf-title" id={titleId}>{title}</h2>{/if}
					</div>

					{#if dismissible}
						<button class="rf-close" type="button" onclick={close} aria-label="Close dialog">
							<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
								<path
									d="M4 4l8 8M12 4l-8 8"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
						</button>
					{/if}
				</header>
			{/if}

			<div class="rf-body">{@render children?.()}</div>

			{#if footer}
				<footer class="rf-foot">{@render footer()}</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	/*
	 * Every custom property below carries a fallback, so the component looks
	 * right in an app that has never heard of this library. Override any of
	 * them from anywhere in your own CSS to theme it. Colour defaults use
	 * `light-dark()`, which follows whatever `color-scheme` your app sets.
	 */

	.rf-layer {
		position: fixed;
		inset: 0;
		z-index: var(--rf-z, 900);
		display: grid;
		place-items: center;
		padding: var(--rf-layer-padding, clamp(1rem, 5vh, 4rem) clamp(1rem, 5vw, 4rem));
		/* No overflow clipping: a 100px blur needs room to bleed. */
	}

	.rf-backdrop {
		position: absolute;
		inset: 0;
		cursor: pointer;
	}

	.rf-dialog {
		position: relative;
		width: min(100%, var(--rf-dialog-width));
		max-height: var(--rf-dialog-max-height, min(80vh, 46rem));
		display: flex;
		flex-direction: column;
		border-radius: var(--rf-radius, 22px);
		border: 1px solid var(--rf-border, light-dark(rgba(9, 12, 20, 0.1), rgba(255, 255, 255, 0.14)));
		/*
		 * `light-dark()` takes two *colours* -- feeding it gradients or whole
		 * shadow values makes the declaration invalid and the property falls
		 * back to its initial value (a transparent, shadowless dialog). So the
		 * themeable colour and the decorative layer are separate properties.
		 */
		background-color: var(--rf-surface, light-dark(#ffffff, #1a1f2c));
		background-image: var(
			--rf-surface-image,
			linear-gradient(168deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0))
		);
		color: var(--rf-fg, light-dark(#1b1f2a, #e9edf6));
		box-shadow: var(
			--rf-shadow,
			0 40px 90px -30px var(--rf-shadow-color, light-dark(rgba(9, 12, 20, 0.3), rgba(0, 0, 0, 0.9)))
		);
		outline: none;
		/* Hint the compositor before a 100px blur lands on it. */
		will-change: filter, transform, opacity;
	}

	.rf-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.5rem 1.6rem 0.9rem;
	}

	.rf-eyebrow {
		margin: 0 0 0.3rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--rf-accent, light-dark(#3b6fd4, #7aa2ff));
	}

	.rf-title {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	.rf-close {
		flex: none;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid var(--rf-border, light-dark(rgba(9, 12, 20, 0.1), rgba(255, 255, 255, 0.14)));
		border-radius: 50%;
		background: transparent;
		color: var(--rf-muted, light-dark(#5a6274, #6b7488));
		font: inherit;
		cursor: pointer;
		transition:
			color var(--rf-dur-tint, 260ms) var(--rf-ease, cubic-bezier(0.22, 1, 0.36, 1)),
			background var(--rf-dur-tint, 260ms) var(--rf-ease, cubic-bezier(0.22, 1, 0.36, 1)),
			transform var(--rf-dur-tint, 260ms) var(--rf-ease, cubic-bezier(0.22, 1, 0.36, 1));
	}

	.rf-close:hover {
		color: inherit;
		background: light-dark(rgba(9, 12, 20, 0.06), rgba(255, 255, 255, 0.08));
		transform: rotate(90deg);
	}

	.rf-body {
		padding: 0.2rem 1.6rem 1.6rem;
		overflow-y: auto;
		color: var(--rf-muted, light-dark(#4d5464, #a3adc2));
	}

	.rf-body :global(p) {
		margin: 0;
	}

	.rf-body :global(p + p) {
		margin-top: 0.75rem;
	}

	.rf-foot {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		padding: 1.05rem 1.6rem;
		border-top: 1px solid
			var(--rf-border, light-dark(rgba(9, 12, 20, 0.1), rgba(255, 255, 255, 0.14)));
		background: light-dark(rgba(9, 12, 20, 0.02), rgba(255, 255, 255, 0.02));
		border-radius: 0 0 var(--rf-radius, 22px) var(--rf-radius, 22px);
	}

	@media (prefers-reduced-motion: reduce) {
		.rf-close {
			transition-duration: 1ms;
		}
	}
</style>
