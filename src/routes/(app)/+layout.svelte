<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { formatBytes, formatNumber } from '$lib/utils/formatting';
	import { isChromiumBased } from '$lib/utils/detection';

	let { data, children } = $props();
	let loading: boolean = $state(true);
	let isSupported: boolean = $state(false)

	onMount(async () => {
		isSupported = await isChromiumBased();
		console.log({ isSupported });
		loading = false;
	})

	const figures = [
		{
			title: 'Total transferred files',
			value: formatNumber(data.stats.totalTransfers)
		},
		{
			title: 'Files scanned for viruses',
			value: formatNumber(data.stats.virusChecked)
		},
		{
			title: 'Total transferred data',
			value: formatBytes(data.stats.bytesTransferred)
		}
	]

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col gap-4">
		
	<div class="flex flex-col md:flex-row justify-between mb-2 gap-4">
		<div class="flex flex-col gap-2">
			<div class="flex gap-3 place-items-center">
				<a href="/">
					<h1 class="text-3xl font-semibold">
						pigeontransfer.com
					</h1>
				</a>
				<a href="https://github.com/NotReeceHarris/pigeontransfer.com" target="_blank" class="mt-1 py-0.5 pl-1.5 pr-2 rounded-md bg-blue-300/30 border border-blue-500/30 text-blue-700 text-xs">
					v{__APP_VERSION__}
				</a>
			</div>
			<p class="text-lg text-gray-600">
				Secure per-to-per file transfer made simple.
			</p>
		</div>

		<a 
			class="group bg-white border border-gray-200 h-max rounded-lg p-3 w-full md:w-max flex place-items-center gap-3"
			href="https://github.com/sponsors/NotReeceHarris?o=esb"
			target="_blank"
		> 
			<svg class="text-pink-500 group-hover:hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path opacity="1" d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"></path></svg>
			<svg class="text-pink-500 hidden group-hover:block" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path opacity="1" d="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z"></path></svg>
			<span>Become a sponsor</span>
		</a>
	</div>

	{#if loading}

		<div class="w-full flex justify-center py-20">
			<svg class="size-5 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
		</div>

	{:else}

		{#if isSupported}
			{@render children?.()}
		{:else}
			<div class="flex flex-col bg-red-100 border border-red-400 text-red-700 px-4 pt-3 pb-4 rounded relative" role="alert">
				<strong class="font-bold">Unsupported Browser!</strong>
				<span class="block sm:inline">
					We are working on supporting your browser, however for now if you want to use this service please use a chromium based browser like 
					<a class="underline" href="https://www.google.co.uk/chrome/" target="_blank">
						Google Chrome
					</a>.
				</span>
			</div>
		{/if}

	{/if}

	<div class="flex flex-col md:flex-row gap-4">

		{#each figures as figure }
			<div class="flex flex-col border border-gray-200 rounded-lg p-4 w-full text-left">
				<p class="text-gray-500 text-sm">
					{figure.title}
				</p>
				<p class="font-bold text-xl">
					{figure.value}
				</p>
			</div>
		{/each}

	</div>

</div>