<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<div class="flex flex-col gap-4">
    
    <div class="flex flex-col md:flex-row justify-between mb-2 gap-4">
        <div class="flex flex-col gap-2">
            <a href="/blog">
                <h1 class="text-3xl font-semibold">
                    pigeontransfer.com/blog
                </h1>
            </a>
            <p class="text-lg text-gray-600">
                Secure peer-to-peer file transfer made simple.
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

    {@render children?.()}

</div>
