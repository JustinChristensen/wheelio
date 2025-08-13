import WebSocket from 'ws';
import { 
  CallQueueEntry, 
  SalesRepConnection, 
  CallQueueSummary, 
  CallQueueUpdate 
} from '../types/call-queue';

// In-memory storage for the call queue and sales rep connections
const callQueue = new Map<string, CallQueueEntry>();
const salesRepConnections = new Map<string, SalesRepConnection>();

/**
 * Add or update a shopper in the call queue
 */
export function addShopperToQueue(shopperId: string, socket: WebSocket): CallQueueEntry {
  const now = Date.now();
  const existingEntry = callQueue.get(shopperId);
  
  if (existingEntry) {
    // Shopper reconnecting - update their socket and mark as connected
    const updatedEntry: CallQueueEntry = {
      ...existingEntry,
      shopperSocket: socket,
      isConnected: true,
      disconnectedAt: undefined
    };
    callQueue.set(shopperId, updatedEntry);
    return updatedEntry;
  } else {
    // New shopper joining the queue
    const newEntry: CallQueueEntry = {
      shopperId,
      shopperSocket: socket,
      connectedAt: now,
      isConnected: true
    };
    callQueue.set(shopperId, newEntry);
    return newEntry;
  }
}

/**
 * Mark a shopper as disconnected
 */
export function markShopperDisconnected(shopperId: string): CallQueueEntry | null {
  const entry = callQueue.get(shopperId);
  if (!entry) return null;
  
  const updatedEntry: CallQueueEntry = {
    ...entry,
    isConnected: false,
    disconnectedAt: Date.now()
  };
  callQueue.set(shopperId, updatedEntry);
  return updatedEntry;
}

/**
 * Remove a shopper from the queue entirely
 */
export function removeShopperFromQueue(shopperId: string): boolean {
  return callQueue.delete(shopperId);
}

/**
 * Add a sales rep connection
 */
export function addSalesRepConnection(salesRepId: string, socket: WebSocket): SalesRepConnection {
  const connection: SalesRepConnection = {
    salesRepId,
    socket,
    connectedAt: Date.now()
  };
  salesRepConnections.set(salesRepId, connection);
  return connection;
}

/**
 * Remove a sales rep connection
 */
export function removeSalesRepConnection(salesRepId: string): boolean {
  return salesRepConnections.delete(salesRepId);
}

/**
 * Assign a call to a sales rep
 */
export function assignCallToSalesRep(shopperId: string, salesRepId: string): CallQueueEntry | null {
  const entry = callQueue.get(shopperId);
  if (!entry) return null;
  
  const updatedEntry: CallQueueEntry = {
    ...entry,
    assignedSalesRepId: salesRepId
  };
  callQueue.set(shopperId, updatedEntry);
  return updatedEntry;
}

/**
 * Release a call from a sales rep
 */
export function releaseCallFromSalesRep(shopperId: string): CallQueueEntry | null {
  const entry = callQueue.get(shopperId);
  if (!entry) return null;
  
  const updatedEntry: CallQueueEntry = {
    ...entry,
    assignedSalesRepId: undefined
  };
  callQueue.set(shopperId, updatedEntry);
  return updatedEntry;
}

/**
 * Get current queue summary with calculated ages
 */
export function getCallQueueSummary(): CallQueueSummary[] {
  const now = Date.now();
  return Array.from(callQueue.values()).map(entry => {
    const ageInSeconds = Math.floor((now - entry.connectedAt) / 1000);
    const timeSinceDisconnectedSeconds = entry.disconnectedAt 
      ? Math.floor((now - entry.disconnectedAt) / 1000)
      : undefined;
    
    return {
      shopperId: entry.shopperId,
      connectedAt: entry.connectedAt,
      disconnectedAt: entry.disconnectedAt,
      isConnected: entry.isConnected,
      ageInSeconds,
      timeSinceDisconnectedSeconds,
      assignedSalesRepId: entry.assignedSalesRepId
    };
  });
}

/**
 * Broadcast queue updates to all connected sales reps
 */
export function broadcastQueueUpdate(): void {
  const queueSummary = getCallQueueSummary();
  const updateMessage: CallQueueUpdate = {
    type: 'queue_update',
    queue: queueSummary
  };
  
  const messageString = JSON.stringify(updateMessage);
  
  salesRepConnections.forEach(connection => {
    try {
      if (connection.socket.readyState === 1) { // WebSocket.OPEN
        connection.socket.send(messageString);
      }
    } catch (error) {
      console.error(`Failed to send queue update to sales rep ${connection.salesRepId}:`, error);
    }
  });
}

/**
 * Get a specific call queue entry
 */
export function getCallQueueEntry(shopperId: string): CallQueueEntry | null {
  return callQueue.get(shopperId) || null;
}

/**
 * Calculate position in queue for a specific shopper
 */
export function getShopperQueuePosition(shopperId: string): number {
  const queueArray = Array.from(callQueue.values())
    .filter(entry => entry.isConnected && !entry.assignedSalesRepId)
    .sort((a, b) => a.connectedAt - b.connectedAt);
  
  const position = queueArray.findIndex(entry => entry.shopperId === shopperId);
  return position === -1 ? 0 : position + 1;
}

/**
 * Get all sales rep connections
 */
export function getSalesRepConnections(): SalesRepConnection[] {
  return Array.from(salesRepConnections.values());
}

/**
 * Clean up old disconnected calls (utility function for potential cleanup jobs)
 */
export function cleanupOldDisconnectedCalls(maxAgeMinutes = 30): number {
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  let cleanedCount = 0;
  
  for (const [shopperId, entry] of callQueue.entries()) {
    if (!entry.isConnected && entry.disconnectedAt) {
      const timeSinceDisconnected = now - entry.disconnectedAt;
      if (timeSinceDisconnected > maxAgeMs) {
        callQueue.delete(shopperId);
        cleanedCount++;
      }
    }
  }
  
  return cleanedCount;
}
