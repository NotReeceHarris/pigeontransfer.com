/**
 * WebRTC utilities for peer-to-peer file transfer
 */

export interface TransferProgress {
	bytesTransferred: number;
	totalBytes: number;
	percentage: number;
}

export interface SignalingMessage {
	type: 'offer' | 'answer' | 'ice-candidate';
	data: any;
	transferCode: string;
}

export class WebRTCManager {
	private peerConnection: RTCPeerConnection;
	private dataChannel: RTCDataChannel | null = null;
	private transferCode: string;
	private onProgressCallback?: (progress: TransferProgress) => void;
	private onCompleteCallback?: (chunks: ArrayBuffer[]) => void;
	private onErrorCallback?: (error: string) => void;
	private onConnectionChangeCallback?: (connected: boolean) => void;
	
	// File transfer state
	private chunks: ArrayBuffer[] = [];
	private totalChunks: number = 0;
	private receivedChunks: number = 0;
	private totalBytes: number = 0;
	private receivedBytes: number = 0;

	constructor(transferCode: string) {
		this.transferCode = transferCode;
		this.peerConnection = new RTCPeerConnection({
			iceServers: [
				{ urls: 'stun:stun.l.google.com:19302' },
				{ urls: 'stun:stun1.l.google.com:19302' }
			]
		});
		
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		this.peerConnection.onicecandidate = (event) => {
			if (event.candidate) {
				this.sendSignalingMessage({
					type: 'ice-candidate',
					data: event.candidate,
					transferCode: this.transferCode
				});
			}
		};

		this.peerConnection.onconnectionstatechange = () => {
			const state = this.peerConnection.connectionState;
			const connected = state === 'connected';
			this.onConnectionChangeCallback?.(connected);
			
			if (state === 'failed' || state === 'disconnected' || state === 'closed') {
				this.onErrorCallback?.('Connection lost');
			}
		};

		this.peerConnection.ondatachannel = (event) => {
			const channel = event.channel;
			this.setupDataChannel(channel);
		};
	}

	private setupDataChannel(channel: RTCDataChannel): void {
		this.dataChannel = channel;
		
		channel.onopen = () => {
			console.log('Data channel opened');
		};
		
		channel.onclose = () => {
			console.log('Data channel closed');
		};
		
		channel.onerror = (error) => {
			console.error('Data channel error:', error);
			this.onErrorCallback?.('Data channel error');
		};
		
		channel.onmessage = (event) => {
			this.handleDataChannelMessage(event.data);
		};
	}

	private handleDataChannelMessage(data: any): void {
		if (typeof data === 'string') {
			// Control message
			const message = JSON.parse(data);
			
			if (message.type === 'transfer-start') {
				this.totalChunks = message.totalChunks;
				this.totalBytes = message.totalBytes;
				this.chunks = new Array(this.totalChunks);
				this.receivedChunks = 0;
				this.receivedBytes = 0;
			} else if (message.type === 'transfer-end') {
				// Verify all chunks received
				if (this.receivedChunks === this.totalChunks) {
					const validChunks = this.chunks.filter(chunk => chunk !== undefined);
					this.onCompleteCallback?.(validChunks);
				} else {
					this.onErrorCallback?.('Transfer incomplete');
				}
			}
		} else if (data instanceof ArrayBuffer) {
			// File chunk
			this.chunks[this.receivedChunks] = data;
			this.receivedChunks++;
			this.receivedBytes += data.byteLength;
			
			// Update progress
			this.onProgressCallback?.({
				bytesTransferred: this.receivedBytes,
				totalBytes: this.totalBytes,
				percentage: (this.receivedBytes / this.totalBytes) * 100
			});
		}
	}

	/**
	 * Create offer (sender side)
	 */
	async createOffer(): Promise<void> {
		// Create data channel
		this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
			ordered: true
		});
		this.setupDataChannel(this.dataChannel);
		
		const offer = await this.peerConnection.createOffer();
		await this.peerConnection.setLocalDescription(offer);
		
		this.sendSignalingMessage({
			type: 'offer',
			data: offer,
			transferCode: this.transferCode
		});
	}

	/**
	 * Handle incoming offer and create answer (receiver side)
	 */
	async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
		await this.peerConnection.setRemoteDescription(offer);
		const answer = await this.peerConnection.createAnswer();
		await this.peerConnection.setLocalDescription(answer);
		
		this.sendSignalingMessage({
			type: 'answer',
			data: answer,
			transferCode: this.transferCode
		});
	}

	/**
	 * Handle incoming answer (sender side)
	 */
	async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
		await this.peerConnection.setRemoteDescription(answer);
	}

	/**
	 * Handle ICE candidate
	 */
	async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
		await this.peerConnection.addIceCandidate(candidate);
	}

	/**
	 * Send file chunks through data channel (sender side)
	 */
	async sendFile(chunks: ArrayBuffer[]): Promise<void> {
		if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
			throw new Error('Data channel not ready');
		}

		const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
		
		// Send transfer start message
		this.dataChannel.send(JSON.stringify({
			type: 'transfer-start',
			totalChunks: chunks.length,
			totalBytes: totalBytes
		}));

		// Send chunks with progress tracking
		let sentBytes = 0;
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			
			// Wait for buffer to have space if needed
			while (this.dataChannel.bufferedAmount > 16777216) { // 16MB buffer limit
				await new Promise(resolve => setTimeout(resolve, 10));
			}
			
			this.dataChannel.send(chunk);
			sentBytes += chunk.byteLength;
			
			// Update progress
			this.onProgressCallback?.({
				bytesTransferred: sentBytes,
				totalBytes: totalBytes,
				percentage: (sentBytes / totalBytes) * 100
			});
		}

		// Send transfer end message
		this.dataChannel.send(JSON.stringify({
			type: 'transfer-end'
		}));
	}

	/**
	 * Send signaling message via server
	 */
	private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
		try {
			await fetch('/api/signaling', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(message)
			});
		} catch (error) {
			console.error('Failed to send signaling message:', error);
		}
	}

	/**
	 * Listen for signaling messages from server
	 */
	startSignalingListener(): void {
		const eventSource = new EventSource(`/api/signaling/${this.transferCode}`);
		
		eventSource.onmessage = async (event) => {
			try {
				const message: SignalingMessage = JSON.parse(event.data);
				
				switch (message.type) {
					case 'offer':
						await this.handleOffer(message.data);
						break;
					case 'answer':
						await this.handleAnswer(message.data);
						break;
					case 'ice-candidate':
						await this.handleIceCandidate(message.data);
						break;
				}
			} catch (error) {
				console.error('Failed to handle signaling message:', error);
			}
		};
		
		eventSource.onerror = () => {
			console.error('Signaling connection error');
			eventSource.close();
		};
	}

	/**
	 * Set callbacks
	 */
	onProgress(callback: (progress: TransferProgress) => void): void {
		this.onProgressCallback = callback;
	}

	onComplete(callback: (chunks: ArrayBuffer[]) => void): void {
		this.onCompleteCallback = callback;
	}

	onError(callback: (error: string) => void): void {
		this.onErrorCallback = callback;
	}

	onConnectionChange(callback: (connected: boolean) => void): void {
		this.onConnectionChangeCallback = callback;
	}

	/**
	 * Check if sender is currently connected
	 */
	isConnected(): boolean {
		return this.peerConnection.connectionState === 'connected';
	}

	/**
	 * Get current connection state
	 */
	getConnectionState(): RTCPeerConnectionState {
		return this.peerConnection.connectionState;
	}

	/**
	 * Close connection and cleanup
	 */
	close(): void {
		this.dataChannel?.close();
		this.peerConnection.close();
	}
}

/**
 * Check if sender is online by attempting to establish connection
 */
export async function checkSenderOnline(transferCode: string): Promise<boolean> {
	return new Promise((resolve) => {
		const webrtc = new WebRTCManager(transferCode);
		let resolved = false;
		
		// Timeout after 10 seconds
		const timeout = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				webrtc.close();
				resolve(false);
			}
		}, 10000);
		
		webrtc.onConnectionChange((connected) => {
			if (!resolved && connected) {
				resolved = true;
				clearTimeout(timeout);
				webrtc.close();
				resolve(true);
			}
		});
		
		webrtc.onError(() => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timeout);
				webrtc.close();
				resolve(false);
			}
		});
		
		// Start connection check
		webrtc.startSignalingListener();
	});
}
