/**
 * File utilities for checksum generation and chunking
 */

/**
 * Generate SHA-256 checksum for a file
 */
export async function generateChecksum(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a 6-character alphanumeric code
 */
export function generateCode(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Chunk file into smaller pieces for WebRTC transfer
 */
export function* chunkFile(file: File, chunkSize: number = 16384): Generator<ArrayBuffer> {
	let offset = 0;
	const reader = new FileReader();
	
	while (offset < file.size) {
		const slice = file.slice(offset, offset + chunkSize);
		yield slice.arrayBuffer();
		offset += chunkSize;
	}
}

/**
 * Convert file to chunks synchronously for WebRTC transfer
 */
export async function getFileChunks(file: File, chunkSize: number = 16384): Promise<ArrayBuffer[]> {
	const chunks: ArrayBuffer[] = [];
	let offset = 0;
	
	while (offset < file.size) {
		const slice = file.slice(offset, offset + chunkSize);
		const buffer = await slice.arrayBuffer();
		chunks.push(buffer);
		offset += chunkSize;
	}
	
	return chunks;
}

/**
 * Verify file integrity using checksum
 */
export async function verifyFileIntegrity(chunks: ArrayBuffer[], expectedChecksum: string): Promise<boolean> {
	// Combine all chunks
	const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const combinedBuffer = new Uint8Array(totalSize);
	
	let offset = 0;
	for (const chunk of chunks) {
		combinedBuffer.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	
	// Generate checksum
	const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	
	return checksum === expectedChecksum;
}

/**
 * Download file from chunks
 */
export function downloadFile(chunks: ArrayBuffer[], filename: string, mimeType: string): void {
	const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const combinedBuffer = new Uint8Array(totalSize);
	
	let offset = 0;
	for (const chunk of chunks) {
		combinedBuffer.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	
	const blob = new Blob([combinedBuffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	
	URL.revokeObjectURL(url);
}

/**
 * Storage utilities for large files
 */
export const fileStorage = {
	/**
	 * Store file chunks in localStorage for files >100MB
	 */
	store(key: string, chunks: ArrayBuffer[]): void {
		const data = chunks.map(chunk => Array.from(new Uint8Array(chunk)));
		localStorage.setItem(key, JSON.stringify(data));
	},
	
	/**
	 * Retrieve file chunks from localStorage
	 */
	retrieve(key: string): ArrayBuffer[] | null {
		const stored = localStorage.getItem(key);
		if (!stored) return null;
		
		try {
			const data = JSON.parse(stored) as number[][];
			return data.map(chunk => new Uint8Array(chunk).buffer);
		} catch {
			return null;
		}
	},
	
	/**
	 * Remove stored file chunks
	 */
	remove(key: string): void {
		localStorage.removeItem(key);
	}
};