<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<title>Rack Focus — motion lab</title>
	<meta
		name="description"
		content="A SvelteKit lab for depth-of-field modals and self-arranging card lists."
	/>
</svelte:head>

{@render children()}
