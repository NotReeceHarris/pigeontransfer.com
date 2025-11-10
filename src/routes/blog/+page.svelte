<script lang="ts">
    const { data } = $props();
</script>

<div>
    {#each data.posts as post }

        <a href="/blog/{post.id}/{post.slug}">
            {post.title}
        </a>
        
    {/each}
</div>