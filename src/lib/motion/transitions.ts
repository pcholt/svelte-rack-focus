import { linear } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { TransitionConfig } from 'svelte/transition';
import { BLUR, DURATION, REDUCED_DURATION } from './tokens';

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const outExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

function reduced(): boolean {
	return typeof window !== 'undefined' && prefersReducedMotion.current;
}

export interface DofParams {
	duration?: number;
	delay?: number;
	/** Blur radius (px) at the far end of the travel. */
	blur?: number;
	/** Scale at the far end of the travel. */
	scale?: number;
	/** Vertical offset (px) at the far end of the travel. */
	y?: number;
	/**
	 * Exponent shaping how blur resolves. `> 1` clears the blur early and
	 * lets the element settle sharp (good for arrivals); `< 1` holds the
	 * blur on and smears out fast (good for departures).
	 */
	blurCurve?: number;
	/** Exponent shaping opacity. `< 1` materialises early, `> 1` late. */
	opacityCurve?: number;
}

/**
 * The house transition: an element drifting through the focal plane of a
 * fast lens.
 *
 * Note the deliberate `easing: linear`. Svelte applies a single easing
 * curve to `t` before handing it to `css`, but blur, opacity and transform
 * want *different* curves -- the element should become opaque well before
 * it becomes sharp, which is what sells the rack-focus. So we take `t` raw
 * and shape each property ourselves.
 */
export function dof(node: Element, params: DofParams = {}): TransitionConfig {
	const {
		duration = DURATION.focus,
		delay = 0,
		blur = BLUR.modal,
		scale = 1,
		y = 0,
		blurCurve = 2.2,
		opacityCurve = 0.55
	} = params;

	if (reduced()) {
		return { duration: REDUCED_DURATION, delay, easing: linear, css: (t) => `opacity: ${t}` };
	}

	return {
		duration,
		delay,
		easing: linear,
		css: (t) => {
			const p = clamp01(t);
			const settle = outExpo(p);
			const radius = blur * Math.pow(1 - p, blurCurve);
			const s = scale + (1 - scale) * settle;
			const ty = y * (1 - settle);

			return `
				opacity: ${Math.pow(p, opacityCurve)};
				filter: blur(${radius.toFixed(2)}px);
				transform: translate3d(0, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)});
			`;
		}
	};
}

/** A modal arriving: fast to appear, unhurried to sharpen. */
export function focusIn(node: Element, params: DofParams = {}): TransitionConfig {
	return dof(node, {
		duration: DURATION.focus,
		blur: BLUR.modal,
		scale: 1.045,
		y: -14,
		blurCurve: 2.2,
		opacityCurve: 0.55,
		...params
	});
}

/** A modal leaving: falls back behind the focal plane and smears away. */
export function focusOut(node: Element, params: DofParams = {}): TransitionConfig {
	return dof(node, {
		duration: DURATION.defocus,
		blur: BLUR.modal,
		scale: 0.965,
		y: 10,
		blurCurve: 0.75,
		opacityCurve: 1.6,
		...params
	});
}

export interface RackParams {
	duration?: number;
	delay?: number;
	/** Blur radius (px) applied to everything behind the backdrop. */
	blur?: number;
	/** Saturation multiplier at full rack. `1` leaves colour alone. */
	saturate?: number;
	/** Brightness multiplier at full rack. `1` leaves exposure alone. */
	brightness?: number;
	/** Vignette colour, as space-separated RGB channels, e.g. `'6 8 14'`. */
	tint?: string;
}

/**
 * The settled appearance of a backdrop at `progress` (0 = untouched page,
 * 1 = fully racked out).
 *
 * This exists so the *static* CSS of a backdrop and the keyframes that
 * animate it cannot drift apart. A Svelte transition hands the element back
 * to its own CSS when it finishes, so if the two disagree the blur snaps off
 * at the end of the intro. One function, both jobs.
 */
export function rackStyle(params: RackParams = {}, progress = 1) {
	const { blur = BLUR.backdrop, saturate = 0.65, brightness = 0.7, tint = '6 8 14' } = params;
	const p = clamp01(progress);

	const radius = blur * Math.pow(p, 0.85);
	const filter =
		`blur(${radius.toFixed(2)}px)` +
		` saturate(${(1 - (1 - saturate) * p).toFixed(3)})` +
		` brightness(${(1 - (1 - brightness) * p).toFixed(3)})`;

	const background =
		`radial-gradient(128% 105% at 50% 42%,` +
		` rgb(${tint} / ${(0.3 * p).toFixed(3)}) 0%,` +
		` rgb(${tint} / ${(0.68 * p).toFixed(3)}) 100%)`;

	return { filter, background };
}

/**
 * The rack itself: the page behind a modal slides out of focus, loses a
 * little saturation and a little light, and picks up a vignette. Run it
 * slower than the modal's own arrival, so the eye reads the modal as the
 * thing the lens chose.
 */
export function rack(node: Element, params: RackParams = {}): TransitionConfig {
	const { duration = DURATION.rack, delay = 0 } = params;

	return {
		duration: reduced() ? REDUCED_DURATION : duration,
		delay,
		easing: linear,
		css: (t) => {
			const { filter, background } = rackStyle(params, t);
			return `
				backdrop-filter: ${filter};
				-webkit-backdrop-filter: ${filter};
				background: ${background};
			`;
		}
	};
}
