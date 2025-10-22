<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();
	let isSupported: boolean = $state(true)

	onMount(() => {
		const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

		if (!isChrome) {
			isSupported = false;
		}
	})


</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div>
	<div class="max-w-3xl mx-auto p-6 flex flex-col gap-6">
		<h1 class="text-6xl">
			{#if page.url.hostname.startsWith('localhost')}
				ESS APP, Proof Of delivery portal
			{:else}
				pigeontransfer.com
			{/if}
		</h1>
		{#if isSupported}
			{@render children?.()}
		{:else}
			<div class="flex flex-col bg-red-100 border border-red-400 text-red-700 px-4 pt-3 pb-4 rounded relative" role="alert">
				<strong class="font-bold">Unsupported Browser!</strong>
				<span class="block sm:inline">We are working on supporting your browser, however for now if you want to use this service please use google chrome</span>
			</div>
		{/if}
	</div>
</div>
