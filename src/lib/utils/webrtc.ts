// WebRTC configuration
const rtcConfiguration: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:standard.relay.metered.ca:80",
            username: "4a6da9fb854082121d407a75",
            credential: "vgL6hiyQ3ICa20xw",
        },
        {
            urls: "turn:standard.relay.metered.ca:80?transport=tcp",
            username: "4a6da9fb854082121d407a75",
            credential: "vgL6hiyQ3ICa20xw",
        },
        {
            urls: "turn:standard.relay.metered.ca:443",
            username: "4a6da9fb854082121d407a75",
            credential: "vgL6hiyQ3ICa20xw",
        },
        {
            urls: "turns:standard.relay.metered.ca:443?transport=tcp",
            username: "4a6da9fb854082121d407a75",
            credential: "vgL6hiyQ3ICa20xw",
        },
    ]
};

// Types
interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

interface TransferProgress {
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
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
        };

        this.pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.pc.iceConnectionState);
        };

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('New ICE candidate:', event.candidate);
            }
        };
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
    private chunkSize: number = 16384; // 16KB chunks

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
                this.handleReceiverMessage(message);
            } catch (error) {
                console.error('Error parsing receiver message:', error);
            }
        };
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

        // Send file metadata first
        const metadata: FileMetadata = {
            name: this.file.name,
            size: this.file.size,
            type: this.file.type
        };

        this.dataChannel.send(JSON.stringify({
            type: 'metadata',
            metadata: metadata
        }));

        // Wait a bit for metadata to be processed, then start sending chunks
        setTimeout(() => this.sendNextChunk(0), 100);
    }

    private async sendNextChunk(sequence: number): Promise<void> {
        if (!this.file || !this.dataChannel) return;

        const start = sequence * this.chunkSize;
        if (start >= this.file.size) {
            // File transfer complete
            this.dataChannel.send(JSON.stringify({
                type: 'transfer_complete'
            }));
            this.events.onFileComplete?.();
            return;
        }

        const end = Math.min(start + this.chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);
        const arrayBuffer = await chunk.arrayBuffer();

        this.dataChannel.send(JSON.stringify({
            type: 'file_chunk',
            sequence: sequence,
            data: arrayBuffer,
            isLast: end >= this.file.size
        }));

        // Update progress
        const progress: TransferProgress = {
            bytesTransferred: end,
            totalBytes: this.file.size,
            percentage: (end / this.file.size) * 100,
            chunksTransferred: sequence + 1,
            totalChunks: Math.ceil(this.file.size / this.chunkSize)
        };

        this.events.onProgress?.(progress);
    }
}

// Receiver class - receives files
export class WebRTCReceiver extends WebRTCBase {
    private receivedChunks: ArrayBuffer[] = [];
    private fileMetadata: FileMetadata | null = null;
    private expectedChunks: number = 0;

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
                    await this.handleSenderMessage(message);
                } else {
                    // Binary data (fallback)
                    console.log('Received binary data, but expected JSON');
                }
            } catch (error) {
                console.error('Error handling sender message:', error);
            }
        };
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
                this.completeFileTransfer();
                break;
        }
    }

    private async handleFileChunk(message: any): Promise<void> {
        if (!this.fileMetadata) return;

        this.receivedChunks[message.sequence] = message.data;

        // Update progress
        const bytesTransferred = this.calculateBytesTransferred();
        const progress: TransferProgress = {
            bytesTransferred: bytesTransferred,
            totalBytes: this.fileMetadata.size,
            percentage: (bytesTransferred / this.fileMetadata.size) * 100,
            chunksTransferred: Object.keys(this.receivedChunks).length,
            totalChunks: this.expectedChunks
        };

        this.events.onProgress?.(progress);

        // Acknowledge chunk receipt
        this.sendAcknowledgment(message.sequence);

        // If this is the last chunk, complete transfer
        if (message.isLast) {
            setTimeout(() => this.completeFileTransfer(), 100);
        }
    }

    private calculateBytesTransferred(): number {
        return this.receivedChunks.reduce((total, chunk) => {
            return total + (chunk ? chunk.byteLength : 0);
        }, 0);
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

        // Combine all chunks into a single file
        const totalSize = this.receivedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combinedBuffer = new Uint8Array(totalSize);
        let offset = 0;

        for (let i = 0; i < this.receivedChunks.length; i++) {
            if (this.receivedChunks[i]) {
                const chunkView = new Uint8Array(this.receivedChunks[i]);
                combinedBuffer.set(chunkView, offset);
                offset += chunkView.byteLength;
            }
        }

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