/**
 * Default motion values for the library.
 *
 * Every component takes these as props, so a consumer never has to reach in
 * here -- but they are exported so you can build on the same rhythm.
 */

export const DURATION = {
	/** Modal arriving: it should feel like a lens finding focus. */
	focus: 620,
	/** Modal leaving: slightly quicker, so dismissal feels responsive. */
	defocus: 440,
	/** Backdrop racking from sharp to its blurred settled state. */
	rack: 720,
	/** A card fading into the list. */
	cardIn: 520,
	/** A card fading out of the list. */
	cardOut: 380,
	/** A card sliding to a new slot. */
	move: 620
} as const;

/** `cubic-bezier` strings, for the CSS-driven half of the system. */
export const EASE = {
	outQuint: 'cubic-bezier(0.22, 1, 0.36, 1)',
	outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
	inOutSoft: 'cubic-bezier(0.65, 0, 0.35, 1)'
} as const;

/** How blurred an out-of-focus thing is at the extreme of its travel. */
export const BLUR = {
	modal: 100,
	backdrop: 10,
	cardIn: 22,
	cardOut: 18
} as const;

/** Duration used by every transition when the user asks for reduced motion. */
export const REDUCED_DURATION = 160;
