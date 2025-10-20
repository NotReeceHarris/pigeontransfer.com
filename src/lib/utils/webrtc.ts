// WebRTC configuration
export const rtcConfiguration: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302"
            ]
        },
        // Remove the broken TURN server for now
        // Add this back later when you have working TURN credentials
    ],
    iceCandidatePoolSize: 10,
    // Remove iceTransportPolicy: 'relay' for now
};

// Types
interface FileMetadata {
    name: string;
    size: number;
    type: string;
    checksum: string;
}

interface TransferProgress {
    bytesTransferred: number;
    chunksTransferred: number;
    totalChunks: number;
}

interface WebRTCEvents {
    onConnectionStateChange?: (state: string) => void;
    onDataChannelOpen?: () => void;
    onDataChannelClose?: () => void;
    onProgress?: (progress: TransferProgress) => void;
    onError?: (error: string) => void;
    onFileComplete?: () => void;
}

// Base WebRTC class with common functionality
abstract class WebRTCBase {
    protected pc: RTCPeerConnection;
    protected dataChannel: RTCDataChannel | null = null;
    protected events: WebRTCEvents;

    constructor(events: WebRTCEvents = {}) {
        this.pc = new RTCPeerConnection(rtcConfiguration);
        this.events = events;
        this.setupConnectionListeners();
    }

    protected setupConnectionListeners(): void {
        this.pc.onconnectionstatechange = () => {
            const state = this.pc.connectionState;
            this.events.onConnectionStateChange?.(state);
            console.log('Connection state:', state);
            
            if (state === 'failed') {
                console.error('Connection failed. Possible issues:');
                console.error('- TURN server not accessible');
                console.error('- Firewall blocking connections');
                console.error('- Invalid TURN credentials');
            }
        };

        this.pc.oniceconnectionstatechange = () => {
            const state = this.pc.iceConnectionState;
            console.log('ICE connection state:', state);
            
            if (state === 'failed') {
                this.events.onError?.('ICE connection failed - check TURN server configuration');
            }
        };

        this.pc.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', this.pc.iceGatheringState);
        };

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate type:', event.candidate.type, 'protocol:', event.candidate.protocol, event.candidate);
                
                // Check if we got relay candidates
                if (event.candidate.type === 'relay') {
                    console.log('✅ Successfully gathered relay candidate');
                }
            } else {
                console.log('✅ ICE candidate gathering complete');
                // Check what types of candidates we collected
                this.logCandidateSummary();
            }
        };
    }

    private logCandidateSummary(): void {
        // This would need to track candidates as they're gathered
        console.log('ICE gathering completed - check if relay candidates were found');
    }

    protected setupDataChannelListeners(channel: RTCDataChannel): void {
        channel.onopen = () => {
            console.log('Data channel opened');
            this.events.onDataChannelOpen?.();
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            this.events.onDataChannelClose?.();
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.events.onError?.(`Data channel error: ${error}`);
        };
    }

    // Clean up resources
    public destroy(): void {
        this.dataChannel?.close();
        this.pc.close();
    }

    // Get connection state
    public getConnectionState(): string {
        return this.pc.connectionState;
    }
}

// Sender class - shares files
export class WebRTCSender extends WebRTCBase {
    private file: File | null = null;
    private fileReader: FileReader = new FileReader();
    private chunkSize: number = 16384; // 16KB chunks
    private connectionConfirmed: boolean = false

    constructor(events: WebRTCEvents = {}) {
        super(events);
        this.createDataChannel();
    }

    private createDataChannel(): void {
        this.dataChannel = this.pc.createDataChannel('fileTransfer', {
            ordered: true,
            maxPacketLifeTime: 3000, // 3 seconds
        });

        this.setupDataChannelListeners(this.dataChannel);
        this.setupSenderDataChannelListeners();
    }

    private setupSenderDataChannelListeners(): void {
        if (!this.dataChannel) return;

        this.dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'hello') {
                    console.log('✅ Receiver says:', message.text);
                    this.connectionConfirmed = true;
                    // Send response back
                    this.sendHelloWorld();
                }
                
                this.handleReceiverMessage(message);
            } catch (error) {
                console.error('Error parsing receiver message:', error);
            }
        };

        this.dataChannel.onopen = () => {
            console.log('✅ Data channel opened - sender side');
            this.events.onDataChannelOpen?.();
            
            // Wait a moment then send hello message
            if (!this.connectionConfirmed) setTimeout(() => this.sendHelloWorld(), 100);
        };
    }

    private sendHelloWorld(): void {
        if (!this.connectionConfirmed && this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'hello',
                text: 'Hello from Sender! Connection established successfully.',
                timestamp: new Date().toISOString()
            }));
            console.log('📤 Sent hello message to receiver');
        }
    }

    private handleReceiverMessage(message: any): void {
        if (message.type === 'ready_for_chunk') {
            this.sendNextChunk(message.sequence);
        } else if (message.type === 'chunk_received') {
            // Receiver acknowledged chunk, send next one
            this.sendNextChunk(message.sequence + 1);
        }
    }

    // Set file to transfer
    public setFile(file: File): void {
        this.file = file;

        this.fileReader = new FileReader();
        this.fileReader.onerror = (error) => {
            console.error('FileReader error:', error);
            this.events.onError?.(`File read error: ${error}`);
        }

        this.fileReader.onload = () => {
            console.log('File ready for transfer:', file.name, file.size, 'bytes');
        }

        this.fileReader.readAsArrayBuffer(file);
    }

    // Create and return an offer
    public async createOffer(): Promise<RTCSessionDescriptionInit> {
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        return offer;
    }

    // Set receiver's answer
    public async setAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        await this.pc.setRemoteDescription(answer);
    }

    // Start file transfer
    public async startTransfer(): Promise<void> {
        if (!this.file) {
            throw new Error('No file set for transfer');
        }

        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            throw new Error('Data channel not ready');
        }

        const fileBuffer = await this.file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        // Send file metadata first
        const metadata: FileMetadata = {
            name: this.file.name,
            size: this.file.size,
            type: this.file.type,
            checksum: hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        };

        this.dataChannel.send(JSON.stringify({
            type: 'metadata',
            metadata: metadata
        }));

        // Wait a bit for metadata to be processed, then start sending chunks
        setTimeout(() => this.sendNextChunk(0), 100);
    }

    private async sendNextChunk(sequence: number): Promise<void> {
        if (!this.fileReader || !this.dataChannel) return;

        const fileBytes = new Uint8Array(this.fileReader.result as ArrayBuffer);

        const start = sequence * this.chunkSize;
        if (start >= fileBytes.length) {
            // File transfer complete
            this.dataChannel.send(JSON.stringify({
                type: 'transfer_complete'
            }));
            this.events.onFileComplete?.();
            return;
        }

        const end = Math.min(start + this.chunkSize, fileBytes.length);
        const chunk = fileBytes.slice(start, end);
        const hexChunk = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('sending chunk', chunk, hexChunk)

        this.dataChannel.send(JSON.stringify({
            type: 'file_chunk',
            sequence: sequence,
            data: hexChunk,
            isLast: end >= fileBytes.length
        }));

        // Update progress
        const progress: TransferProgress = {
            bytesTransferred: end,
            chunksTransferred: sequence + 1,
            totalChunks: Math.ceil(fileBytes.length / this.chunkSize)
        };

        this.events.onProgress?.(progress);
    }
}

// Receiver class - receives files
export class WebRTCReceiver extends WebRTCBase {
    private receivedChunks: {
        [key: number]: Uint8Array;
    } = {};
    private fileMetadata: FileMetadata | null = null;
    private expectedChunks: number = 0;
    private connectionConfirmed: boolean = false;
    private transferComplete: boolean = false;

    constructor(events: WebRTCEvents = {}) {
        super(events);
        this.setupDataChannelHandler();
    }

    private setupDataChannelHandler(): void {
        this.pc.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannelListeners(this.dataChannel);
            this.setupReceiverDataChannelListeners();
        };
    }

    private setupReceiverDataChannelListeners(): void {
        if (!this.dataChannel) return;

        this.dataChannel.onmessage = async (event) => {
            try {
                if (typeof event.data === 'string') {
                    const message = JSON.parse(event.data);
                    
                    // Handle hello message
                    if (message.type === 'hello') {
                        console.log('✅ Sender says:', message.text);
                        this.connectionConfirmed = true;
                        // Send response back
                        this.sendHelloWorld();
                    } else {
                        await this.handleSenderMessage(message);
                    }
                } else {
                    console.log('Received binary data, but expected JSON');
                }
            } catch (error) {
                console.error('Error handling sender message:', error);
            }
        };

        this.dataChannel.onopen = () => {
            console.log('✅ Data channel opened - receiver side');
            this.events.onDataChannelOpen?.();
            
            // Wait a moment then send hello message
            if (!this.connectionConfirmed) setTimeout(() => this.sendHelloWorld(), 100);
        };
    }

    private sendHelloWorld(): void {
        if (!this.connectionConfirmed && this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'hello',
                text: 'Hello from Receiver! Ready to receive file.',
                timestamp: new Date().toISOString()
            }));
            console.log('📤 Sent hello message to sender');
        }
    }

    private async handleSenderMessage(message: any): Promise<void> {
        switch (message.type) {
            case 'metadata':
                this.fileMetadata = message.metadata;
                this.expectedChunks = Math.ceil(message.metadata.size / 16384);
                console.log('Receiving file:', this.fileMetadata);
                // Signal ready for first chunk
                this.sendAcknowledgment(0);
                break;

            case 'file_chunk':
                await this.handleFileChunk(message);
                break;

            case 'transfer_complete':
                if (!this.transferComplete) this.completeFileTransfer();
                break;
        }
    }

    private async handleFileChunk(message: any): Promise<void> {
        if (!this.fileMetadata) return;

        console.log(`Received chunk: `, message);

        const hexEncodedData: string = message.data;
        const decodedData = new Uint8Array(hexEncodedData.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        this.receivedChunks[message.sequence] = decodedData;

        // Update progress
        const bytesTransferred = this.calculateBytesTransferred();
        const progress: TransferProgress = {
            bytesTransferred: bytesTransferred,
            chunksTransferred: Object.keys(this.receivedChunks).length,
            totalChunks: this.expectedChunks
        };

        this.events.onProgress?.(progress);

        // Acknowledge chunk receipt
        this.sendAcknowledgment(message.sequence);

        // If this is the last chunk, complete transfer
        if (message.isLast && !this.transferComplete) {
            this.transferComplete = true;
            setTimeout(() => this.completeFileTransfer(), 100);
        }
    }

    private calculateBytesTransferred(): number {
        let total = 0;
        for (const key in this.receivedChunks) {
            total += this.receivedChunks[key].byteLength;
        }
        return total;
    }

    private sendAcknowledgment(sequence: number): void {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'chunk_received',
                sequence: sequence
            }));
        }
    }

    private completeFileTransfer(): void {
        if (!this.fileMetadata) return;
        console.log('File transfer complete:', this.receivedChunks);

        Object.values(this.receivedChunks).forEach(chunk => {
            console.log(typeof chunk);
        })

        // Combine all chunks into a single file (sequentially order)
        const receivedSize = Object.values(this.receivedChunks).reduce((acc, chunk) => acc + chunk.byteLength, 0);
        const combinedBuffer = new Uint8Array(receivedSize);

        console.log('calculated received size:', receivedSize);
        
        let offset = 0;
        for (let i = 0; i < this.expectedChunks; i++) {
            const chunk = this.receivedChunks[i];
            if (chunk) {
                combinedBuffer.set(chunk, offset);
                offset += chunk.byteLength;
            }
        }

        console.log('Combined file size:', combinedBuffer.byteLength);
        console.log('Expected file size:', this.fileMetadata.size);
        console.log('data:', combinedBuffer);


        // Create download link
        const blob = new Blob([combinedBuffer], { type: this.fileMetadata.type });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileMetadata.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.events.onFileComplete?.();
    }

    // Set sender's offer and create answer
    public async setOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        await this.pc.setRemoteDescription(offer);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        return answer;
    }
}

// Utility functions
export const WebRTCUtils = {
    // Validate if WebRTC is supported
    isSupported(): boolean {
        return !!(window.RTCPeerConnection && window.RTCDataChannel);
    },

    // Create a unique transfer ID
    generateTransferId(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    },

    // Convert file to base64 (alternative transfer method)
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};