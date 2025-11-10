<script lang="ts">
    import { marked } from 'marked';
    import privacyMD from '$docs/privacy.md?raw';
</script>

<div class="flex flex-col gap-4">
    <h1 class="text-4xl font-semibold">
        Privacy Policy
    </h1>

    <div class="markdown-body">
        {@html marked.parse(privacyMD)}
    </div>
</div>