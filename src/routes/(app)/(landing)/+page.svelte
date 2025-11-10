<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { onDestroy, onMount } from "svelte";
    import { WebRTCSender } from '$lib/utils/webrtc';
    import type { SubmitFunction } from "./$types";
    import { browser } from "$app/environment";
    import { formatBytes } from "$lib/utils/formatting";
    
    let pollingInterval: NodeJS.Timeout | null = $state(null);
    let senderWebRTC: WebRTCSender | null = $state(null);
    let dropZone: HTMLLabelElement | null = $state(null);

    let connectionMessage = $state('');
    let errorMessage = $state('');
    let status: ('upload' | 'waiting' | 'connected' | 'transferring' | 'complete' | 'error') = $state('upload');
    let transferProgress = $state({ percentage: 0, bytesTransferred: 0, totalBytes: 0});
    let fileReady = $state(false);

    let file: File | null = $state(null);
    let code = $state('');
    let offer: RTCSessionDescriptionInit | null = $state(null);

    /* File Metadata */
    let name = $state('');
    let size = $state(0);
    let type = $state('');
    let checksum = $state('');

    /* Workers */
    let hashWorker: Worker | null = null;
    let isHashing = $state(false);
    let processingProgress = $state(0);

    async function handleFileUpload(file: File) {
        if (!hashWorker) {
            errorMessage = 'Worker not initialized';
            return;
        }

        isHashing = true;
        errorMessage = '';

        hashWorker.postMessage({ file });
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

    onMount(async () => {

        hashWorker = new Worker('/worker/checksum.worker.js');

        hashWorker.onmessage = async (e) => {
            isHashing = false;
            
            if (e.data.success) {
                name = e.data.name;
                size = e.data.size;
                type = e.data.type;
                checksum = e.data.checksum;

                console.log('File hashed successfully:', {
                    name,
                    size,
                    type,
                    checksum
                });
                
                if (!senderWebRTC) {
                    errorMessage = 'WebRTC sender instance is not initialized.';
                    return;
                }
                
                try {
                    // You'll need to pass the file to setFile - see note below
                    await senderWebRTC.setFile(file!);
                } catch (error: any) {
                    errorMessage = `Error setting file: ${error.message}`;
                }
            } else {
                errorMessage = `Hashing failed: ${e.data.error}`;
            }
        };
        
        hashWorker.onerror = (error) => {
            console.log(error)
            isHashing = false;
            errorMessage = `Worker error: ${error.message}`;
        };

        senderWebRTC = new WebRTCSender({
            onConnectionStateChange: (state) => {
                console.log('Sender connection state:', state);
                
                if (state === 'connected') {
                    status = 'connected';
                    connectionMessage = '✅ Connected to recipient!';
                    console.log('Sender fully connected to receiver!');
                } else if (state === 'connecting') {
                    connectionMessage = '🔄 Connecting to recipient...';
                } else if (state === 'failed') {
                    status = 'error';
                    connectionMessage = '❌ Connection failed';
                }
            },
            onProcessingProgress: (progress) => {
                processingProgress = progress;
            },
            onDataChannelOpen: () => {
                console.log('Sender data channel opened');
                connectionMessage = '📡 Data channel ready - establishing connection...';
            },
            onProgress: (progress) => {
                transferProgress.bytesTransferred = progress.bytesTransferred;
                transferProgress.totalBytes = size;
                transferProgress.percentage = (progress.bytesTransferred / size) * 100;

                if (progress.totalChunks !== progress.chunksTransferred) {
                    status = 'transferring';
                }
            },
            onFileReady: () => {
                console.log('File is ready for transfer');
                fileReady = true;
            },
            onFileComplete: () => {
                console.log('File transfer complete!');
                status = 'complete';
                connectionMessage = '✅ File transfer completed successfully!';
            },
            onError: (error) => {
                console.error('WebRTC error:', error);
                errorMessage = error;
                status = 'error';
            }
        });

        // Pre-create the offer to reduce wait time later
        offer = await senderWebRTC.createOffer().catch((err) => {
            console.error('Error creating WebRTC offer:', err);
            return null;
        });

        window.addEventListener("dragover", (event: DragEvent) => {
            if (!event.dataTransfer || !event.target || !dropZone) return;

            const fileItems = [...event.dataTransfer.items].filter(
                (item) => item.kind === "file",
            );
            if (fileItems.length > 0) {
                event.preventDefault();
                if (event.target instanceof Node && !dropZone.contains(event.target)) {
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

    async function startFileTransfer() {
        if (!senderWebRTC || !file) {
            errorMessage = 'WebRTC sender or file not initialized.';
            return;
        }

        // Wait for data channel to be ready
        let attempts = 0;
        const maxAttempts = 60;
        
        while (attempts < maxAttempts) {
            if (senderWebRTC.getConnectionState() === 'connected') {
                try {
                    await senderWebRTC.startTransfer();
                    console.log('File transfer started!');
                    return;
                } catch (error) {
                    console.error('Error starting transfer:', error);
                    errorMessage = `Failed to start transfer: ${error}`;
                    status = 'error';
                    return;
                }
            }
            
            // Wait 100ms and try again
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // If we get here, connection never established
        errorMessage = 'Connection failed - data channel never became ready';
        status = 'error';
    }

    const handleCreate: SubmitFunction = async ({ formData }) => {

        if (!file) {
            errorMessage = 'Please select a file to transfer.';
            return;
        }

        if (!senderWebRTC) {
            errorMessage = 'WebRTC sender instance is not initialized.';
            return;
        }

        formData.delete('file');
        formData.append('name', name);
        formData.append('size', size.toString());
        formData.append('type', type);
        formData.append('checksum', checksum);

        senderWebRTC.setMetaData(name, type, size, checksum);

        offer = await senderWebRTC.createOffer().catch((err) => {
            console.error('Error creating WebRTC offer:', err);
            return null;
        });

        if (!offer || !offer.sdp || !offer.type || offer.type !== 'offer') {
            errorMessage = 'Failed to create WebRTC offer.';
            return;
        }

        formData.append('offer', offer.sdp);

        return ({ result }) => {
            
            if (!!senderWebRTC && result.type === 'success' && result.data && result.data.success && result.data.code && result.data.verification && !result.data.error && typeof result.data.code === 'string' && typeof result.data.verification === 'string') {
                
                code = result.data.code;
                const verification = result.data.verification;
                senderWebRTC.setVerification(verification);

                status = 'waiting';
                errorMessage = '';
                connectionMessage = '⏳ Waiting for recipient to connect...';
                
                pollingInterval = setInterval(async () => {
                    if (!code || !senderWebRTC || !browser) return;

                    const response = await fetch(`/api/${code}/answer`).catch((err) => {
                        console.error('Error fetching answer:', err);
                        return null;
                    });

                    if (!response || !response.ok) return;

                    const data = await response.json();
                    if (data.answer && !data.error) {
                        console.log('Received answer from recipient, setting answer...');
                        clearInterval(pollingInterval!);
                        pollingInterval = null;

                        await senderWebRTC.setAnswer({
                            type: 'answer',
                            sdp: data.answer
                        });

                        // Don't start transfer immediately - wait for connection
                        connectionMessage = '🔄 Establishing connection...';
                        
                        // Monitor connection state and start transfer when ready
                        const connectionCheck = setInterval(() => {
                            if (!senderWebRTC) return;

                            const state = senderWebRTC.getConnectionState();
                            console.log('Current connection state:', state);
                            
                            if (state === 'connected') {
                                clearInterval(connectionCheck);
                                console.log('Connection established, starting transfer...');
                                connectionMessage = '✅ Connected! Starting transfer...';
                                startFileTransfer();
                            } else if (state === 'failed' || state === 'disconnected') {
                                clearInterval(connectionCheck);
                                status = 'error';
                                errorMessage = `Connection failed: ${state}`;
                            }
                        }, 500);

                        // Timeout after 10 seconds
                        setTimeout(() => {

                            if (!senderWebRTC) return;

                            clearInterval(connectionCheck);
                            if (senderWebRTC.getConnectionState() !== 'connected') {
                                status = 'error';
                                errorMessage = 'Connection timeout - failed to establish connection';
                            }
                        }, 10000);

                    } else if (data.error) {
                        clearInterval(pollingInterval!);
                        pollingInterval = null;
                        status = 'error';
                        errorMessage = data.error;
                    }
                }, 2500);

            } else if (result.type === 'error' || (result.type === 'success' && result.data && result.data.error)) {
                console.log('Form submission error:', result);
                errorMessage = (result as unknown as {data:{error:string}}).data?.error || 'An unknown error occurred.';
            }
        }
    }

    onDestroy(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        if (senderWebRTC) {
            senderWebRTC.destroy();
            senderWebRTC = null;
        }
    });

</script>

<svelte:head>
    <title>Send File - Pigeon Transfer</title>
    <meta name="description" content="Send files directly to others using peer-to-peer WebRTC technology. No uploads, no storage, just direct transfers." />
</svelte:head>

<form action="?/create" method="post" use:enhance={handleCreate} class="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">

    {#if file}
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p class="text-sm text-gray-800"><span class="font-medium">Filename:</span> {file.name}</p>
            <p class="text-sm text-gray-800"><span class="font-medium">Size:</span> {formatBytes(file.size)}</p>
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

    {#if code}
        {#if status === 'waiting'}
            <div class="flex flex-col gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <p class="text-sm">File transfer created! Share this link with the recipient:</p>
                <p class="text-lg font-mono">
                    {page.url.origin}/{code}
                </p>
                <p class="text-sm">
                    Please <strong>DO NOT</strong> close this page until the recipient has downloaded the file.
                </p>
            </div>
        {/if}

        <div class="flex flex-col gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            {#if status === 'waiting'}
                <p class="text-sm text-blue-700">
                    {connectionMessage}
                </p>
            {:else if status === 'connected'}
                <p class="text-sm text-green-700">
                    {connectionMessage}
                </p>
            {:else if status === 'transferring'}
                <p class="text-sm text-blue-700">
                    📤 Transferring file... ({transferProgress.percentage.toFixed(2)} %)
                </p>
            {:else if status === 'complete'}
                <p class="text-sm text-green-700">
                    {connectionMessage}
                </p>
            {:else if status === 'error'}
                <p class="text-sm text-red-700">
                    {errorMessage || 'An error occurred during the file transfer.'}
                </p>
                <p class="text-xs text-red-600">
                    Tip: This often happens when both users are behind restrictive firewalls. 
                    Try using a different network or browser.
                </p>
            {/if}
        </div>
    {:else}
        {@const buttonText = "Transfer a file"}
        
        <div class="flex flex-col gap-3">
            <button type="submit" disabled={!!code && !fileReady} class="{!code && fileReady ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex place-items-center gap-3 place-content-center">

                {#if !fileReady && file}
                    <svg class="size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Preparing file ({processingProgress.toFixed(2)}%)...</span>
                {:else}
                    {buttonText}
                {/if}
                
            </button>

            <p class="text-sm text-gray-500 leading-0 pt-3 pb-0.5">
                By clicking "{buttonText}", you agree to our <a href="/docs/terms" class="text-blue-600 underline">Terms of Service</a> and <a href="/docs/privacy" class="text-blue-600 underline">Privacy Policy</a>.
            </p>
        </div>
    {/if}

    {#if errorMessage}
        <div class="flex flex-col gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-700">{errorMessage}</p>
        </div>
    {/if}

</form>