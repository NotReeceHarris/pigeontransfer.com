<script lang="ts">

    import { PUBLIC_MAX_FILE_SIZE } from '$env/static/public';
    import { enhance } from '$app/forms';
    const MAX_UPLOAD_SIZE = parseInt(PUBLIC_MAX_FILE_SIZE)

    let file: File | null = null;
    let errors: string[] = [];

    let createForm: HTMLFormElement;

    function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            file = input.files[0];
            errors = [];

            if (file.size > MAX_UPLOAD_SIZE) {
                errors.push(`File size exceeds the maximum limit of ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB.`);
                file = null;
            }

        }
    }

</script>


<form action="?/create" method="post" use:enhance={async ({ formData })=>{

    if (!file) {
        errors.push('No file selected.');
        return;
    }

    const checksum = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const hashArray = Array.from(new Uint8Array(checksum));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    formData.append('name', file.name);
    formData.append('size', file.size.toString());
    formData.append('type', file.type);
    formData.append('checksum', hashHex);

    return async ({ result }) => {
        if (result.type === 'success') {
            console.log(result)
        } else {
            errors.push('An unexpected error occurred. Please try again.');
        }
    }



}}>

    <input type="file" on:change={handleFileChange} />

    <button disabled={!file}>
        Create Transfer Link
    </button>

</form>

{#if errors.length > 0}
    <ul class="text-red-500">
        {#each errors as error}
            <li>{error}</li>
        {/each}
    </ul>
{/if}

{#if file}
    <p>Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
{/if}