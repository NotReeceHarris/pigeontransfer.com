<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { WebRTCReceiver } from '$lib/utils/webrtc';
    import { goto } from '$app/navigation';

    const { data } = $props();

    let receiver: WebRTCReceiver | null = $state(null);

    let downloadStatus = $state<'accepting' | 'waiting' | 'connecting' | 'downloading' | 'verifying' | 'complete' | 'error'>('accepting');
    let downloadProgress = $state({ 
        percentage: 0, 
        bytesTransferred: 0, 
        totalBytes: data.transfer ? Number(data.transfer.bytes) : 0 
    });
    let isLargeFile = $state(false);
    let errorMessage = $state('');
    let connectionMessage = $state('');

    function formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function formatDate(date: Date): string {
        return new Date(date).toLocaleString();
    }

    async function startDownload() {

        if (!data.transfer && downloadStatus !== 'accepting') return;

        receiver = new WebRTCReceiver({
            onConnectionStateChange: (state) => {
                console.log('Receiver connection state:', state);
                
                if (state === 'connected') {
                    downloadStatus = 'connecting';
                    connectionMessage = '✅ Connected to sender - waiting for file...';
                    console.log('🎉 Receiver connected to sender!');
                } else if (state === 'connecting') {
                    connectionMessage = '🔄 Connecting to sender...';
                } else if (state === 'failed') {
                    downloadStatus = 'error';
                    connectionMessage = '❌ Connection failed';
                    errorMessage = 'Failed to connect to sender';
                }
            },
            onDataChannelOpen: () => {
                console.log('✅ Receiver data channel opened');
                connectionMessage = '📡 Data channel ready - waiting for file transfer...';
            },
            onProgress: (progress) => {

                downloadProgress = {
                    percentage: (progress.bytesTransferred / data.transfer.bytes) * 100,
                    bytesTransferred: progress.bytesTransferred,
                    totalBytes: data.transfer.bytes
                };
                
                if (progress.totalChunks !== progress.chunksTransferred) {
                    downloadStatus = 'downloading';
                }
            },
            onFileComplete: () => {
                console.log('✅ File download complete!');
                downloadStatus = 'complete';
                connectionMessage = '✅ File downloaded successfully!';
            },
            onError: (error) => {
                console.error('WebRTC error:', error);
                errorMessage = error;
                downloadStatus = 'error';
            }
        });

        receiver.setMetaData(
            data.transfer.filename,
            data.transfer.mimeType,
            Number(data.transfer.bytes),
            data.transfer.checksum
        )

        try {
            // Set sender's offer and create answer
            const answer = await receiver.setOffer({
                sdp: data.offer,
                type: 'offer'
            });

            if (!answer || !answer.sdp || !answer.type || answer.type !== 'answer') {
                errorMessage = 'Failed to create WebRTC answer.';
                downloadStatus = 'error';
                return;
            }

            console.log('✅ Created WebRTC answer, sending to server...');

            const formData = new FormData();
            formData.append('answer', answer.sdp);

            const response = await fetch(`/api/${data.transfer.code}/answer`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                errorMessage = result.error || 'Failed to send WebRTC answer to server.';
                downloadStatus = 'error';
                return;
            }

            if (result.success !== true) {
                errorMessage = result.error || 'Server returned an error.';
                downloadStatus = 'error';
                return;
            }

            console.log('✅ Answer sent to server successfully');
            downloadStatus = 'connecting';
            connectionMessage = '🔄 Establishing connection with sender...';

            // Monitor connection state
            const connectionCheck = setInterval(() => {
                if (!receiver) {
                    clearInterval(connectionCheck);
                    return;
                }
                
                const state = receiver.getConnectionState();
                console.log('Current receiver connection state:', state);
                
                if (state === 'connected') {
                    clearInterval(connectionCheck);
                    console.log('✅ Connection established, waiting for file...');
                    connectionMessage = '✅ Connected! Waiting for file transfer to start...';
                } else if (state === 'failed' || state === 'disconnected') {
                    clearInterval(connectionCheck);
                    downloadStatus = 'error';
                    errorMessage = `Connection failed: ${state}`;
                }
            }, 500);

            // Timeout after 15 seconds
            setTimeout(() => {
                clearInterval(connectionCheck);
                if (receiver && receiver.getConnectionState() !== 'connected') {
                    downloadStatus = 'error';
                    errorMessage = 'Connection timeout - failed to establish connection with sender';
                }
            }, 15000);

        } catch (error) {
            console.error('Error during WebRTC setup:', error);
            errorMessage = `WebRTC setup failed: ${error}`;
            downloadStatus = 'error';
        }
    }

    onMount(async () => {
        if (!data.transfer) {
            errorMessage = 'No transfer data available.';
            downloadStatus = 'error';
            return;
        }

        if (!data.offer) {
            errorMessage = 'No WebRTC offer found for this transfer.';
            downloadStatus = 'error';
            return;
        }
    });

    onDestroy(() => {
        if (receiver) {
            receiver.destroy();
            receiver = null;
        }
    });

</script>

{#if data.error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h1 class="text-xl font-bold text-red-900 mb-2">Transfer Error</h1>
        <p class="text-red-700 mb-4">{data.error}</p>
        <a href="/" class="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Transfer a file now</a>
    </div>
{:else if data.transfer}
    <div class="bg-white border border-gray-200 rounded-lg p-6">
        <!-- File Info -->
        <div class="mb-6">
            <div class="flex items-center mb-4">
                <svg class="w-8 h-8 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <div>
                    <h1 class="text-xl font-bold text-gray-900">{data.transfer.filename}</h1>
                    <p class="text-sm text-gray-500">
                        {formatFileSize(data.transfer.bytes)} • {data.transfer.mimeType}
                    </p>
                </div>
            </div>
            
            <div class="flex flex-col gap-2">
                
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="font-medium text-gray-700">Created:</span>
                        <span class="text-gray-600">{formatDate(data.transfer.createdAt)}</span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">Status:</span>
                        <span class="text-gray-600">
                            {#if downloadStatus === 'accepting'}
                                <span class="text-yellow-600">Waiting</span>
                            {:else if downloadStatus === 'waiting'}
                                <span class="text-yellow-600">Waiting</span>
                            {:else if downloadStatus === 'connecting'}
                                <span class="text-blue-600">Connecting</span>
                            {:else if downloadStatus === 'downloading'}
                                <span class="text-green-600">Downloading</span>
                            {:else if downloadStatus === 'complete'}
                                <span class="text-green-600">Complete</span>
                            {:else if downloadStatus === 'error'}
                                <span class="text-red-600">Error</span>
                            {/if}
                        </span>
                    </div>
                </div>

                <div class="text-sm flex flex-col">
                    <span class="font-medium text-gray-700">Checksum</span>
                    <span class="text-gray-600">{data.transfer.checksum}</span>
                </div>

            </div>
        </div>

        {#if downloadStatus === "accepting"}
            <button onclick={()=>startDownload()} type="button" class="w-full cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Download file
            </button>
        {:else}

            <!-- Connection Status -->
            {#if connectionMessage}
                <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p class="text-sm text-blue-700 text-left">{connectionMessage}</p>
                </div>
            {/if}

            <!-- Download Status -->
            {#if downloadStatus === 'waiting'}
                <div class="text-center">
                    <button 
                        class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled
                    >
                        Preparing Download...
                    </button>
                </div>
            {:else if downloadStatus === 'connecting'}
                <div class="text-center">
                    <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-600">Connecting to sender...</p>
                </div>
            {:else if downloadStatus === 'downloading'}
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-700">Downloading...</span>
                        <span class="text-sm text-gray-500">{downloadProgress.percentage.toFixed(1)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {downloadProgress.percentage}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 text-center">
                        {formatFileSize(downloadProgress.bytesTransferred)} of {formatFileSize(downloadProgress.totalBytes)}
                    </p>
                </div>
            {:else if downloadStatus === 'verifying'}
                <div class="text-center">
                    <div class="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-600">Verifying file integrity...</p>
                </div>
            {:else if downloadStatus === 'complete'}
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <svg class="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <h3 class="text-lg font-semibold text-green-900 mb-2">Download Complete!</h3>
                    <p class="text-green-700 text-sm">
                        Your file should now be downloading to your device.
                        {#if isLargeFile}
                            <br>Large files are temporarily stored in your browser for better performance.
                        {/if}
                    </p>
                </div>
            {:else if downloadStatus === 'error'}
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3 class="text-lg font-semibold text-red-900 mb-2">Download Failed</h3>
                    <p class="text-red-700 text-sm mb-4">{errorMessage}</p>
                    <button 
                        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        onclick={() => goto(`/${data.transfer.code}`)}
                    >
                        Try Again
                    </button>
                </div>
            {/if}
            
            {#if downloadStatus !== 'waiting' && downloadStatus !== 'complete'}
                <div class="mt-4 text-center">
                    <p class="text-xs text-gray-500">Keep this page open during the transfer</p>
                </div>
            {/if}

        {/if}

    </div>
{/if}