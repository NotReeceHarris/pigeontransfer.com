<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    
    let errorMessage = $state('');
    let file: File | null = $state(null);

    let name = $state('');
    let size = $state(0);
    let type = $state('');
    let checksum = $state('');

    let code = $state('');

    async function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            file = input.files[0];
        }

        if (file) {
            name = file.name;
            size = file.size;
            type = file.type;

            const fileBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        } else {
            name = '';
            size = 0;
            type = '';
            checksum = '';
        }
    }

</script>

<form action="?/create" method="post" use:enhance={async ({ formData }) => {

    if (!file) {
        errorMessage = 'Please select a file to transfer.';
        return;
    }

    formData.delete('file');
    formData.append('name', name);
    formData.append('size', size.toString());
    formData.append('type', type);
    formData.append('checksum', checksum);

    return ({ result }) => {
        if (result.type === 'success') {
            code = result.data.code;
            errorMessage = '';
        } else if (result.type === 'error') {
            errorMessage = result.data?.error || 'An unknown error occurred.';
    }

}}} class="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">

    <div class="flex flex-col">
        <label for="file" class="block text-sm font-medium text-gray-700 mb-2">Select a file to transfer:</label>
        <input type="file" oninput={handleFileChange} id="file">
    </div>

    {#if file}
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p class="text-sm text-gray-800"><span class="font-medium">Filename:</span> {file.name}</p>
            <p class="text-sm text-gray-800"><span class="font-medium">Size:</span> {Math.round(file.size / 1024)} KB</p>
            <p class="text-sm text-gray-800"><span class="font-medium">Type:</span> {file.type || 'N/A'}</p>
            <p class="text-sm text-gray-800"><span class="font-medium">SHA-256 Checksum:</span> {checksum}</p>
        </div>
    {/if}

    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        Transfer a file
    </button>

    {#if code}
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-800">File transfer created! Share this link with the recipient:</p>
            <p class="mt-2 text-lg font-mono text-green-900">
                {page.url.origin}/{code}
            </p>
        </div>
    {/if}

    {#if errorMessage}
        <p class="text-red-600 mt-4">{errorMessage}</p>
    {/if}

</form>
