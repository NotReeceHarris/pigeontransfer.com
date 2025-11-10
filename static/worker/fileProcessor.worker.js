// fileProcessor.worker.ts
self.onmessage = async function(e) {
    const { fileBuffer, chunkSize } = e.data;
    
    try {
        const fileBytes = new Uint8Array(fileBuffer);
        const chunks = [];
        const totalChunks = Math.ceil(fileBytes.length / chunkSize);

        for (let i = 0; i < fileBytes.length; i += chunkSize) {
            const chunk = fileBytes.slice(i, i + chunkSize);
            
            // Convert chunk to base64 without using spread operator
            let binaryString = '';
            for (let j = 0; j < chunk.length; j++) {
                binaryString += String.fromCharCode(chunk[j]);
            }
            const encodedChunk = btoa(binaryString);
            
            chunks.push(encodedChunk);
            
            // Progress updates
            if (chunks.length % 100 === 0) {
                self.postMessage({
                    type: 'progress',
                    progress: (i / fileBytes.length) * 100,
                    processedChunks: chunks.length
                });
            }
        }

        self.postMessage({
            type: 'complete',
            chunks
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};