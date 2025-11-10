<script lang="ts">
    import { marked } from 'marked';
    import termsMD from '$docs/terms.md?raw';
</script>

<svelte:head>
    <title>Terms of Service - Pigeon Transfer</title>
    <meta name="description" content="Read the terms of service of pigeontransfer.com to understand the rules and regulations for using our service." />
</svelte:head>

<div class="flex flex-col gap-4">
    <h1 class="text-4xl font-semibold">
        Terms of Service
    </h1>

    <div class="markdown-body">
        {@html marked.parse(termsMD)}
    </div>
</div>

