/**
 * Signaling utilities for WebRTC message coordination
 */

// Store signaling messages temporarily in memory
// In production, you'd want to use Redis or similar
export const signalingMessages = new Map<string, any[]>();
export const clients = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Broadcast messages to all connected clients for a transfer code
 */
export function broadcastMessage(transferCode: string, message: any) {
    const clientSet = clients.get(transferCode);
    if (clientSet) {
        const messageData = `data: ${JSON.stringify(message)}\n\n`;
        clientSet.forEach(controller => {
            try {
                controller.enqueue(messageData);
            } catch (error) {
                // Remove dead connections
                clientSet.delete(controller);
            }
        });
    }
}

/**
 * Add signaling message to queue and broadcast to clients
 */
export function addSignalingMessage(transferCode: string, type: string, data: any) {
    // Store the signaling message
    if (!signalingMessages.has(transferCode)) {
        signalingMessages.set(transferCode, []);
    }

    const messages = signalingMessages.get(transferCode)!;
    const message = {
        type,
        data,
        timestamp: Date.now()
    };
    
    messages.push(message);

    // Keep only recent messages (last 10)
    if (messages.length > 10) {
        messages.splice(0, messages.length - 10);
    }

    // Broadcast to connected clients
    broadcastMessage(transferCode, message);
}