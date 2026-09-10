const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Keep Tab focus inside `node` while it is mounted, and move focus into it
 * once (deliberately *after* a frame, so the browser does not scroll a
 * still-blurred, still-transparent dialog into view mid-transition).
 */
export function trapFocus(node: HTMLElement) {
	const targets = () =>
		Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(el) => el.offsetParent !== null || el === document.activeElement
		);

	// Focus the dialog itself rather than its first control: a focus ring
	// landing on the close button the instant a dialog opens is exactly the
	// kind of sudden appearance this lab is trying to avoid. Tab moves on
	// from here as normal.
	const frame = requestAnimationFrame(() => node.focus({ preventScroll: true }));

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const items = targets();
		if (items.length === 0) {
			event.preventDefault();
			node.focus({ preventScroll: true });
			return;
		}

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement as HTMLElement | null;

		if (event.shiftKey && (active === first || active === node)) {
			event.preventDefault();
			last.focus({ preventScroll: true });
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus({ preventScroll: true });
		}
	}

	node.addEventListener('keydown', onKeydown);

	return {
		destroy() {
			cancelAnimationFrame(frame);
			node.removeEventListener('keydown', onKeydown);
		}
	};
}
