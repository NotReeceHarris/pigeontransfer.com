<script lang="ts">

    import { marked } from 'marked';
    import moment from 'moment';

    const { data } = $props();

    const createdAt = moment(data.post.created);
    const updatedAt = moment(data.post.updated);

</script>

<svelte:head>
    <title>{data.post.title} - Pigeon Transfer</title>
    <meta name="description" content={data.post.description} />

    <meta name="created" content={createdAt.format('YYYY-MM-DD')}>
    <meta name="revised" content={updatedAt.format('YYYY-MM-DD')}>
</svelte:head>

<div>
    <a href="/blog" class="flex place-items-center gap-2 text-sm">
        <svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path opacity="1" d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
        <span>All articles</span>
    </a>
</div>

<article 
    class="markdown-body border-b border-gray-200 pb-5"
    data-ai-generated={data.post.aiDetails.isAiGenerated} 
    data-ai-enhanced={data.post.aiDetails.isAiEnhanced}
    data-ai-free={data.post.aiDetails.isAiGenerated === false && data.post.aiDetails.isAiEnhanced === false}
    data-ai-tools={data.post.aiDetails.aiTools}
    data-ai-tagged-date="2024-08-26"
>

    <img class="rounded-md" src="{data.post.banner?.file.url}?w=720" alt={data.post.banner?.file.title} srcset="">

    <h1>
        {data.post.title}
    </h1>

    <div class="flex place-items-center gap-2 text-sm mb-6 metadata">

        <span>
            published: {createdAt.format('MMMM Do, YYYY').toLowerCase()}
        </span>

        {#if data.post.created !== data.post.updated}

            <span class="text-md">•</span>
            <span>
                updated: {updatedAt.format('MMMM Do, YYYY').toLowerCase()}
            </span>

        {/if}

        <span class="text-md">•</span>
        <span>
            {data.post.readtime}
        </span>

    </div>

    {@html marked.parse(data.post.content)}
</article>