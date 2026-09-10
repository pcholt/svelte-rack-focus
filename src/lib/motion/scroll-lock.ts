/**
 * Reference-counted body scroll lock.
 *
 * The width of the scrollbar is compensated with padding so that locking
 * never produces a horizontal jolt -- a "sudden appearance" by another
 * name. (`scrollbar-gutter: stable` in app.css handles most browsers; this
 * is the belt to that pair of braces.)
 */
let locks = 0;
let restore: (() => void) | null = null;

export function lockScroll(): () => void {
	if (typeof document === 'undefined') return () => {};

	if (locks++ === 0) {
		const html = document.documentElement;
		const body = document.body;
		const gap = window.innerWidth - html.clientWidth;

		const prev = {
			htmlOverflow: html.style.overflow,
			bodyOverflow: body.style.overflow,
			bodyPadding: body.style.paddingRight
		};

		html.style.overflow = 'hidden';
		body.style.overflow = 'hidden';
		if (gap > 0) {
			const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
			body.style.paddingRight = `${current + gap}px`;
		}

		restore = () => {
			html.style.overflow = prev.htmlOverflow;
			body.style.overflow = prev.bodyOverflow;
			body.style.paddingRight = prev.bodyPadding;
		};
	}

	let released = false;
	return () => {
		if (released) return;
		released = true;
		if (--locks === 0) {
			restore?.();
			restore = null;
		}
	};
}
