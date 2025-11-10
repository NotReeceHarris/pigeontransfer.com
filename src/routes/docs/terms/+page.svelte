<script lang="ts">
    import { marked } from 'marked';
    import termsMD from '$docs/terms.md?raw';
</script>

<div class="flex flex-col gap-4">
    <h1 class="text-4xl font-semibold">
        Terms of Service
    </h1>

    <div class="markdown-body">
        {@html marked.parse(termsMD)}
    </div>
</div>

