<script lang="ts">

    import { marked } from 'marked';
    import moment from 'moment';
    
    const { data } = $props();

</script>

<svelte:head>
    <title>{data.post.title} - Pigeon Transfer</title>
    <meta name="description" content={data.post.description} />
</svelte:head>

<article 
    class="markdown-body"
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

    {@html marked.parse(data.post.content)}
</article>