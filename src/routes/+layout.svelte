<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="">
	<div class="max-w-2xl mx-auto p-6">
		{@render children?.()}
	</div>
</div>
