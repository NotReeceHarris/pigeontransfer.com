<script lang="ts">
    import moment from 'moment';

    const { data } = $props();


    const featured = data.posts[0];
    const posts = data.posts.slice(1);
</script>

<svelte:head>
    <title>Blog - Pigeon Transfer</title>
    <meta name="description" content="Read the latest articles and updates from Pigeon Transfer." />
</svelte:head>

<div class="flex flex-col gap-4">
    <a href="/blog/{featured.id}/{featured.slug}" class="group flex flex-col gap-4 border border-gray-200 p-4 rounded-md">

        <img src="{featured.image.url}?w=686" alt={featured.image?.title} class="w-full h-auto rounded-md object-cover"/>

        <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold">
                {featured.title}
            </h2>
            <div class="flex place-items-center gap-2 text-xs text-gray-500">
                <span>
                    {moment(featured.created).format('MMMM Do, YYYY').toLowerCase()}
                </span>

                <span class="text-sm">•</span>

                <span>
                    {featured.readtime}
                </span>
            </div>
            

            <div class="flex gap-4 place-items-end">
                <p class="text-sm text-gray-700">
                    {featured.description}
                </p>
                <svg class="size-8 ml-2 group-hover:text-blue-700" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path opacity="1" d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path></svg>
            </div>

        </div>

    </a>

    <div class="grid grid-cols-2 gap-4">
        {#each posts as post }

            <a href="/blog/{post.id}/{post.slug}" class="group flex flex-col gap-4 border border-gray-200 p-4 rounded-md">

                <img src="{post.image.url}?w=318" alt={post.image?.title} class="w-full h-auto rounded-md object-cover"/>

                <div class="flex flex-col gap-1">
                    <h2 class="text-lg font-semibold">
                        {post.title}
                    </h2>
                    <div class="flex place-items-center gap-2 text-xs text-gray-500">
                        <span>
                            {moment(post.created).format('MMMM Do, YYYY').toLowerCase()}
                        </span>

                        <span class="text-md">•</span>

                        <span>
                            {post.readtime}
                        </span>
                    </div>

                    <p class="text-xs text-gray-700">
                        {post.description}
                    </p>

                </div>

            </a>
            
        {/each}
    </div>
</div>