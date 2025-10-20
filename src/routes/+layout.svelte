<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div>
	<div class="max-w-2xl mx-auto p-6 flex flex-col gap-6">
		<h1 class="text-6xl">ESS APP, Proof Of delivery portal</h1>
		{@render children?.()}
	</div>
</div>
