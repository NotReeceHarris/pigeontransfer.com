<script lang="ts">

    import { marked } from 'marked';
    const { data } = $props();

</script>

<svelte:head>
    <title>{data.post.title} - Pigeon Transfer Blog</title>
    <meta name="description" content={data.post.description} />
</svelte:head>

<h1>
    {data.post.title}
</h1>

<div>
    {@html marked.parse(data.post.content)}
</div>