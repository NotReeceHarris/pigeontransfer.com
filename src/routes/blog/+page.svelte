<script lang="ts">
    const { data } = $props();
</script>

<svelte:head>
    <title>Blog - Pigeon Transfer</title>
    <meta name="description" content="Read the latest articles and updates from Pigeon Transfer." />
</svelte:head>

<div>
    {#each data.posts as post }

        <a href="/blog/{post.id}/{post.slug}">
            {post.title}
        </a>
        
    {/each}
</div>