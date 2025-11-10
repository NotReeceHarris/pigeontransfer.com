<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/state';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="max-w-3xl mx-auto p-6 flex flex-col justify-between min-h-screen gap-6">
    <div>
        {@render children?.()}
    </div>
    <div class="flex flex-col md:flex-row justify-between gap-3 text-gray-500 text-sm place-items-center">
		<p>
			&copy; {new Date().getFullYear()} All rights reserved.
		</p>
		<div class="flex place-items-center gap-3">

			{#if page.url.pathname.startsWith('/blog')}
				<a href="/" class="hover:text-blue-600">
					Transfer Files
				</a>
			{:else}
				<a href="/blog" class="hover:text-blue-600">
					Blog
				</a>
			{/if}

			<span class="text-xs">|</span>

			<a href="/docs/privacy" class="hover:text-blue-600">
				Privacy Policy
			</a>

			<span class="text-xs">|</span>

			<a href="/docs/terms" class="hover:text-blue-600">
				Terms of Service
			</a>
		</div>
	</div>
</div>