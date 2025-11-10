<script lang="ts">

    import { marked } from 'marked';
    const { data } = $props();

</script>

<h1>
    {data.post.title}
</h1>

<div>
    {@html marked.parse(data.post.content)}
</div>