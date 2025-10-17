<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { onDestroy, onMount } from "svelte";
    import { WebRTCSender } from '$lib/utils/webrtc';
    
    let status: ('upload' | 'waiting' | 'connected' | 'transferring' | 'complete' | 'error') = $state('upload');
    let errorMessage = $state('');
    let file: File | null = $state(null);
    let pollingInterval: NodeJS.Timeout | null = $state(null);
    let senderWebRTC: WebRTCSender | null = $state(null);
    let debounce: number = $state(0);

    let name = $state('');
    let size = $state(0);
    let type = $state('');
    let checksum = $state('');
    let code = $state('');

    let dropZone: HTMLLabelElement;

    async function handleFileUpload(file: File) {
        name = file.name;
        size = file.size;
        type = file.type;

        const fileBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            file = input.files[0];
        }

        if (file) {
            handleFileUpload(file);
        } else {
            name = '';
            size = 0;
            type = '';
            checksum = '';
        }
    }

    async function handleDragOver(event: DragEvent) {

        if (!event.dataTransfer) return;

        const fileItems = [...event.dataTransfer.items].filter(
            (item) => item.kind === "file",
        );
        if (fileItems.length > 0) {
                event.preventDefault();
            if (fileItems.some((item) => item.type.startsWith("image/"))) {
                event.dataTransfer.dropEffect = "copy";
            } else {
                event.dataTransfer.dropEffect = "none";
            }
        }
    }

    async function handleDrop(event: DragEvent) {
        event.preventDefault();

        console.log('Drop event:', event);

        if (!event.dataTransfer) return;

        const files = [...event.dataTransfer.items]
            .map((item) => item.getAsFile())
            .filter((file) => file);

        if (files.length > 0) {
            file = files[0];

            if (file) {
                handleFileUpload(file);
            } else {
                name = '';
                size = 0;
                type = '';
                checksum = '';
            }
        }
    }

    onMount(() => {
        window.addEventListener("dragover", (event: DragEvent) => {

            if (!event.dataTransfer || !event.target || !dropZone) return;

            const fileItems = [...event.dataTransfer.items].filter(
                (item) => item.kind === "file",
            );
            if (fileItems.length > 0) {
                event.preventDefault();
                if (!dropZone.contains(event.target)) {
                    event.dataTransfer.dropEffect = "none";
                }
            }
        });

        window.addEventListener("drop", (event) => {

            if (!event.dataTransfer) return;

            if ([...event.dataTransfer.items].some((item) => item.kind === "file")) {
                event.preventDefault();
            }
        });
    });

    onDestroy(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        if (senderWebRTC) {
            senderWebRTC = null;
        }

        debounce = 0;
    });

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

    senderWebRTC = new WebRTCSender({
        onConnectionStateChange: (state) => {
            console.log('Sender connection state:', state);
        },
        onProgress: (progress) => {
            console.log(`Transfer progress: ${progress.percentage.toFixed(1)}%`);
        }
    });

    senderWebRTC.setFile(file);
    const offer = await senderWebRTC.createOffer();
    
    if (!offer || !offer.sdp || !offer.type || offer.type !== 'offer') {
        errorMessage = 'Failed to create WebRTC offer.';
        return;
    }

    formData.append('offer', offer.sdp);

    return ({ result }) => {
        
        if (result.type === 'success' && result.data && result.data.code && !result.data.error && typeof result.data.code === 'string') {
            
            code = result.data.code;
            status = 'waiting';
            errorMessage = '';
            pollingInterval = setInterval(async () => {

                if (!code) {
                    console.error('No code available for polling.');
                    return;
                }

                if (!senderWebRTC) {
                    console.error('WebRTC sender instance is not initialized.');
                    return;
                }
                
                const response = await fetch(`/api/${code}/answer`).catch((err) => {
                    console.error('Error fetching answer:', err);
                    return null;
                });

                if (!response || !response.ok) {
                    console.error('Failed to fetch answer from server.');
                    return;
                }

                const data = await response.json();
                if (data.answer && !data.error) {

                    console.log('Received answer from recipient, setting answer...');

                    clearInterval(pollingInterval!);
                    pollingInterval = null;

                    await senderWebRTC.setAnswer({
                        type: 'answer',
                        sdp: data.answer
                    });

                } else if (data.error) {
                    clearInterval(pollingInterval!);
                    pollingInterval = null;
                    status = 'error';
                    errorMessage = data.error;
                } else if (data.answer == null && !data.error) {
                    console.log('Answer not yet available, continuing to poll...');
                }

            }, 2500);
        } else if (result.type === 'error') {
            errorMessage = result.data?.error || 'An unknown error occurred.';
        }

    }}} class="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">

    

    {#if file}
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p class="text-sm text-gray-800"><span class="font-medium">Filename:</span> {file.name}</p>
            <p class="text-sm text-gray-800"><span class="font-medium">Size:</span> {Math.round(file.size / 1024)} KB</p>
            <p class="text-sm text-gray-800"><span class="font-medium">Type:</span> {file.type || 'N/A'}</p>
            <p class="text-sm text-gray-800"><span class="font-medium">SHA-256 Checksum:</span> {checksum}</p>
        </div>
    {:else}
        <div class="flex items-center justify-center w-full">
            <label ondragover={handleDragOver} ondrop={handleDrop} bind:this={dropZone} for="dropzone-file" class="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg class="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">Click to upload</span> or drag and drop</p>
                </div>
                <input id="dropzone-file" oninput={handleFileChange} type="file" class="hidden" />
            </label>
        </div> 
    {/if}

    <button type="submit" disabled={!!code} class="{!code ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        Transfer a file
    </button>

    {#if code}
        <div class="flex flex-col gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <p class="text-sm">File transfer created! Share this link with the recipient:</p>
            <p class="text-lg font-mono">
                {page.url.origin}/{code}
            </p>
            <p class="text-sm">
                Please <strong>DO NOT</strong> close this page until the recipient has downloaded the file.
            </p>
        </div>

        <div class="flex flex-col">
            {#if status === 'waiting'}
                <p class="text-sm text-gray-700">Waiting for recipient to connect...</p>
            {:else if status === 'connected'}
                <p class="text-sm text-gray-700">Transferring file...</p>
            {:else if status === 'transferring'}
                <p class="text-sm text-gray-700">Transferring file...</p>
            {:else if status === 'complete'}
                <p class="text-sm text-green-700">File transfer complete!</p>
            {:else if status === 'error'}
                <p class="text-sm text-red-700">
                    {
                        errorMessage || 'An error occurred during the file transfer.'
                    }
                </p>
            {/if}

        </div>
    {/if}

    {#if errorMessage}
        <p class="text-red-600 mt-4">{errorMessage}</p>
    {/if}

</form>
