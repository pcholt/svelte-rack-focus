/**
 * Move a node to the end of `document.body` (or another target).
 *
 * A modal has to escape whatever `overflow`, `transform`, `filter` or
 * `z-index` context it happens to be declared in -- any of those would
 * either clip it or break `position: fixed`. Portalling keeps the modal's
 * markup where it is authored while rendering it at the top of the page.
 */
export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
	let destroyed = false;

	function move(to: HTMLElement | string) {
		if (destroyed) return;
		const el = typeof to === 'string' ? document.querySelector<HTMLElement>(to) : to;
		if (el) el.appendChild(node);
	}

	move(target);

	return {
		update: move,
		destroy() {
			destroyed = true;
			node.remove();
		}
	};
}
