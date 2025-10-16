<script lang="ts">

    const { data } = $props();
    
</script>

{#if data.error}

    <h1>{data.error}</h1>
    <a href="/">Transfer a file now</a>

{:else}
{/if}