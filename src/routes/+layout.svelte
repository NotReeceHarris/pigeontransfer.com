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


{#if page.url.hostname.startsWith('localhost')}
	<div class="bg-[#131416]">
		<div class="max-w-screen-sm mx-auto bg-white">
			<div class="bg-mint flex flex-col  min-h-screen overflow-y-hidden">

				<nav class="relative bg-white flex justify-center place-items-center">

					<button  aria-label="Toggle Menu" class="absolute z-10 left-4 text-moss cursor-pointer" type="button">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path opacity="1" d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"></path></svg>
					</button>

					<img class="w-2/4" src="/logo.png" alt="Essential Access Platforms & Site Services">
				</nav>

				<main class="gap-3 flex flex-col">

					<div class="flex flex-col h-full">

					<div class="p-2 bg-moss flex place-items-center justify-between w-full text-xl">

						<button  class="rounded-md py-1 px-2 cursor-pointer font-medium text-white">
							Summary
						</button>

						<button  class="rounded-md py-1 px-2 cursor-pointer font-medium text-white">
							Items
						</button>

						<button  class="rounded-md py-1 px-2 cursor-pointer font-medium text-white">
							Notes
						</button>

						<button  class="rounded-md py-1 px-2 cursor-pointer font-medium text-moss bg-white">
							Photos
						</button>

						<button  class="rounded-md py-1 px-2 cursor-pointer font-medium text-white">
							Signature
						</button>

					</div>

					<div class="flex flex-col p-4 gap-3 grow text-moss">
						<h1 class="font-semibold text-sm">
							Proof of derlivery
						</h1>
						
						<div>
							{@render children()}
						</div>

					</div>

					

				</div>
					
				</main>

			</div>
		</div>
	</div>
{:else}
	<div>
		<div class="max-w-3xl mx-auto p-6 flex flex-col gap-6">
			
			<div class="flex place-items-center gap-2">
				<img src="./logo.svg" class="w-10" alt="" srcset="">
				<h1 class="text-5xl">
					pigeontransfer.com
				</h1>
			</div>

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
{/if}
