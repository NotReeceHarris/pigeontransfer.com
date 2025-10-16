<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    const { data } = $props();

    let checkingStatus = $state(false);
    let senderOnline = $state(false);
    let downloadStatus = $state<'waiting' | 'connecting' | 'downloading' | 'verifying' | 'complete' | 'error'>('waiting');
    let downloadProgress = $state({ percentage: 0, bytesTransferred: 0, totalBytes: data.transfer ? Number(data.transfer.bytes) : 0 });
    let isLargeFile = $state(false);
    let errorMessage = $state('');

    function formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function formatDate(date: Date): string {
        return new Date(date).toLocaleString();
    }

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
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="font-medium text-gray-700">Created:</span>
                    <span class="text-gray-600">{formatDate(data.transfer.createdAt)}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-700">Sender:</span>
                    <span class="text-gray-600">
                        {#if checkingStatus}
                            <span class="text-yellow-600">Checking...</span>
                        {:else if senderOnline}
                            <span class="text-green-600">Online</span>
                        {:else}
                            <span class="text-red-600">Offline</span>
                        {/if}
                    </span>
                </div>
            </div>
        </div>

        <!-- Download Status -->
        {#if downloadStatus === 'waiting'}
            <div class="text-center">
                {#if !senderOnline && !checkingStatus}
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p class="text-sm text-yellow-800">The sender is currently offline.</p>
                        <p class="text-xs text-yellow-600 mt-1">Ask them to return to the transfer page to resume.</p>
                        <button 
                            class="mt-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"

                        >
                            Check Again
                        </button>
                    </div>
                {/if}
                
                <button 
                    class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!senderOnline || checkingStatus}
                >
                    {checkingStatus ? 'Checking Sender...' : 'Download File'}
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
    </div>
{/if}

