import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Svelte/SvelteKit options live in `svelte.config.js` so that `svelte-package`
// sees exactly the same configuration this dev server does.
export default defineConfig({
	plugins: [sveltekit()]
});
