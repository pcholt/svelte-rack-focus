import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * All Svelte configuration lives here rather than in `vite.config.ts`.
 *
 * `svelte-package` reads this file directly — it never goes through Vite — so
 * keeping one source of truth is what stops the published package and the dev
 * app from being compiled differently.
 *
 * `vitePreprocess({ script: true })` is what strips `lang="ts"` out of the
 * components at package time, so what ships is plain JS that any Svelte 5 app
 * can compile without a TypeScript preprocessor of its own. The `script`
 * transform is opt-in as of vite-plugin-svelte 4 — the dev server handles TS
 * itself and does not need it, but `svelte-package` very much does.
 *
 * @type {import('@sveltejs/kit').Config}
 */
export default {
	preprocess: vitePreprocess({ script: true }),

	compilerOptions: {
		// Force runes mode for our own code, but leave libraries alone.
		// Can be removed in Svelte 6.
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},

	kit: {
		// adapter-auto only supports some environments. Swap this for the
		// adapter that matches wherever the demo is deployed.
		adapter: adapter()
	}
};
