<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/state";
    import { onDestroy, onMount } from "svelte";
    import { WebRTCSender, rtcConfiguration } from '$lib/utils/webrtc';
    
    let status: ('upload' | 'waiting' | 'connected' | 'transferring' | 'complete' | 'error') = $state('upload');
    let errorMessage = $state('');
    let file: File | null = $state(null);
    let pollingInterval: NodeJS.Timeout | null = $state(null);
    let senderWebRTC: WebRTCSender | null = $state(null);

    let name = $state('');
    let size = $state(0);
    let type = $state('');
    let checksum = $state('');
    let code = $state('');
    let connectionMessage = $state('');

    let dropZone: HTMLLabelElement | null = $state(null);

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

    async function testWebRTCConnection(): Promise<boolean> {
        return new Promise((resolve) => {
            const testPC = new RTCPeerConnection(rtcConfiguration);
            let connected = false;

            testPC.onconnectionstatechange = () => {
                console.log('Test connection state:', testPC.connectionState);
                if (testPC.connectionState === 'connected') {
                    connected = true;
                    testPC.close();
                    resolve(true);
                } else if (testPC.connectionState === 'failed') {
                    testPC.close();
                    resolve(false);
                }
            };

            // Create data channel to trigger connection
            const dc = testPC.createDataChannel('test');
            dc.onopen = () => {
                connected = true;
                testPC.close();
                resolve(true);
            };

            testPC.createOffer()
                .then(offer => testPC.setLocalDescription(offer))
                .catch(() => resolve(false));

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!connected) {
                    testPC.close();
                    resolve(false);
                }
            }, 6000);
        });
    }


    onMount(async () => {

        const webrtcWorking = await testWebRTCConnection();
        if (!webrtcWorking) {
            console.error('❌ WebRTC connection test failed - check configuration');
            errorMessage = 'WebRTC not working in this browser/environment';
        } else {
            console.log('✅ WebRTC connection test passed');
        }

        senderWebRTC = new WebRTCSender({
            onConnectionStateChange: (state) => {
                console.log('Sender connection state:', state);
                
                if (state === 'connected') {
                    status = 'connected';
                    connectionMessage = '✅ Connected to recipient!';
                    console.log('🎉 Sender fully connected to receiver!');
                } else if (state === 'connecting') {
                    connectionMessage = '🔄 Connecting to recipient...';
                } else if (state === 'failed') {
                    status = 'error';
                    connectionMessage = '❌ Connection failed';
                }
            },
            onDataChannelOpen: () => {
                console.log('✅ Sender data channel opened');
                connectionMessage = '📡 Data channel ready - establishing connection...';
            },
            onProgress: (progress) => {
                if (progress.totalChunks !== progress.chunksTransferred) {
                    status = 'transferring';
                }
            },
            onFileComplete: () => {
                console.log('✅ File transfer complete!');
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
        await senderWebRTC.createOffer().catch((err) => {
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

        senderWebRTC.setFile(file);

        // Wait for data channel to be ready
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds total
        
        while (attempts < maxAttempts) {
            if (senderWebRTC.getConnectionState() === 'connected') {
                try {
                    await senderWebRTC.startTransfer();
                    console.log('📤 File transfer started!');
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

<form action="?/create" method="post" use:enhance={async ({ formData }) => {

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

    const offer = await senderWebRTC.createOffer().catch((err) => {
        console.error('Error creating WebRTC offer:', err);
        return null;
    });

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
            connectionMessage = '⏳ Waiting for recipient to connect...';
            
            pollingInterval = setInterval(async () => {
                if (!code || !senderWebRTC) return;

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
                            console.log('✅ Connection established, starting transfer...');
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
        } else if (result.type === 'error') {
            errorMessage = (result as unknown as {data:{error:string}}).data?.error || 'An unknown error occurred.';
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

        <div class="flex flex-col gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            {#if status === 'waiting'}
                <p class="text-sm text-blue-700">{connectionMessage}</p>
            {:else if status === 'connected'}
                <p class="text-sm text-green-700">{connectionMessage}</p>
            {:else if status === 'transferring'}
                <p class="text-sm text-blue-700">📤 Transferring file...</p>
            {:else if status === 'complete'}
                <p class="text-sm text-green-700">{connectionMessage}</p>
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
    {/if}

    {#if errorMessage}
        <p class="text-red-600 mt-4">{errorMessage}</p>
    {/if}

</form>