self.onmessage = async function(e) {
    const { file } = e.data;
    
    try {
        const fileBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        
        // Fixed and optimized conversion - use the original reliable method
        const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        self.postMessage({ 
            success: true, 
            checksum,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream'
        });
    } catch (error) {
        self.postMessage({ 
            success: false, 
            error: error.message 
        });
    }
};