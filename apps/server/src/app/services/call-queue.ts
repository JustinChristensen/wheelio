import WebSocket from 'ws';
import { 
  CallQueueEntry, 
  SalesRepConnection, 
  CallQueueSummary, 
  CallQueueUpdate,
  MediaCapabilities,
} from '../types/call-queue';

// In-memory storage for the call queue and sales rep connections
const callQueue = new Map<string, CallQueueEntry>();
const salesRepConnections = new Map<string, SalesRepConnection>();

// Collaboration state tracking
interface CollaborationSession {
  shopperId: string;
  salesRepId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ended';
  requestedAt: number;
  respondedAt?: number;
}

// In-memory storage for collaboration sessions
const collaborationSessions = new Map<string, CollaborationSession>();

/**
 * Generate a unique key for a collaboration session
 */
function getCollaborationKey(shopperId: string, salesRepId: string): string {
  return `${salesRepId}:${shopperId}`;
}

/**
 * Request collaboration between a sales rep and shopper
 */
export function requestCollaboration(shopperId: string, salesRepId: string): CollaborationSession | null {
  // Verify the sales rep is currently handling this shopper's call
  const callEntry = getCallQueueEntry(shopperId);
  if (!callEntry || callEntry.assignedSalesRepId !== salesRepId) {
    return null;
  }

  const sessionKey = getCollaborationKey(shopperId, salesRepId);
  
  // Check if there's already a pending collaboration request
  const existingSession = collaborationSessions.get(sessionKey);
  if (existingSession && existingSession.status === 'pending') {
    return null; // Already have a pending request
  }

  const session: CollaborationSession = {
    shopperId,
    salesRepId,
    status: 'pending',
    requestedAt: Date.now()
  };

  collaborationSessions.set(sessionKey, session);
  return session;
}

/**
 * Respond to a collaboration request
 */
export function respondToCollaboration(
  shopperId: string, 
  salesRepId: string, 
  accepted: boolean
): CollaborationSession | null {
  const sessionKey = getCollaborationKey(shopperId, salesRepId);
  const session = collaborationSessions.get(sessionKey);
  
  if (!session || session.status !== 'pending') {
    return null;
  }

  session.status = accepted ? 'accepted' : 'rejected';
  session.respondedAt = Date.now();
  
  collaborationSessions.set(sessionKey, session);
  return session;
}

/**
 * End a collaboration session
 */
export function endCollaboration(shopperId: string, salesRepId: string): CollaborationSession | null {
  const sessionKey = getCollaborationKey(shopperId, salesRepId);
  const session = collaborationSessions.get(sessionKey);
  
  if (!session) {
    return null;
  }

  session.status = 'ended';
  collaborationSessions.set(sessionKey, session);
  return session;
}

/**
 * Get collaboration session status
 */
export function getCollaborationStatus(shopperId: string, salesRepId: string): CollaborationSession | null {
  const sessionKey = getCollaborationKey(shopperId, salesRepId);
  return collaborationSessions.get(sessionKey) || null;
}

/**
 * Clean up expired collaboration requests (older than 5 minutes)
 */
export function cleanupExpiredCollaborationRequests(): number {
  const now = Date.now();
  const expireAfterMs = 5 * 60 * 1000; // 5 minutes
  let cleanedCount = 0;

  for (const [key, session] of collaborationSessions.entries()) {
    if (session.status === 'pending' && (now - session.requestedAt) > expireAfterMs) {
      collaborationSessions.delete(key);
      cleanedCount++;
    }
  }

  return cleanedCount;
}

/**
 * Periodic cleanup for disconnected callsnew Map<string, SalesRepConnection>();

/**
 * Add or update a shopper in the call queue with media capabilities
 */
export function addShopperToQueue(
  shopperId: string, 
  socket: WebSocket,
  options?: {
    hasMicrophone: boolean;
    mediaCapabilities: MediaCapabilities;
  }
): CallQueueEntry {
  const now = Date.now();
  const existingEntry = callQueue.get(shopperId);
  
  // Default media capabilities if not provided
  const defaultCapabilities: MediaCapabilities = {
    hasAudioInput: false,
    audioInputDevices: 0,
    detectionError: 'No capabilities provided',
    detectedAt: new Date()
  };
  
  if (existingEntry) {
    // Shopper reconnecting - update their socket and mark as connected
    const updatedEntry: CallQueueEntry = {
      ...existingEntry,
      shopperSocket: socket,
      isConnected: true,
      disconnectedAt: undefined,
      // Update capabilities if provided
      hasMicrophone: options?.hasMicrophone ?? existingEntry.hasMicrophone,
      mediaCapabilities: options?.mediaCapabilities ?? existingEntry.mediaCapabilities
    };
    callQueue.set(shopperId, updatedEntry);
    return updatedEntry;
  } else {
    // New shopper joining the queue
    const newEntry: CallQueueEntry = {
      shopperId,
      shopperSocket: socket,
      connectedAt: now,
      isConnected: true,
      hasMicrophone: options?.hasMicrophone ?? false,
      mediaCapabilities: options?.mediaCapabilities ?? defaultCapabilities
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
 * Check if a sales rep is currently handling any calls
 */
export function isSalesRepBusy(salesRepId: string): boolean {
  for (const entry of callQueue.values()) {
    if (entry.assignedSalesRepId === salesRepId) {
      return true;
    }
  }
  return false;
}

/**
 * Get the call that a sales rep is currently handling (if any)
 */
export function getSalesRepCurrentCall(salesRepId: string): CallQueueEntry | null {
  for (const entry of callQueue.values()) {
    if (entry.assignedSalesRepId === salesRepId) {
      return entry;
    }
  }
  return null;
}

/**
 * Assign a call to a sales rep
 */
export function assignCallToSalesRep(
  shopperId: string, 
  salesRepId: string, 
  sdpOffer?: RTCSessionDescriptionInit
): CallQueueEntry | null {
  const entry = callQueue.get(shopperId);
  if (!entry) return null;
  
  // Check if the call is already assigned to someone else
  if (entry.assignedSalesRepId && entry.assignedSalesRepId !== salesRepId) {
    return null; // Call already claimed by another sales rep
  }
  
  // Check if the sales rep is already busy with another call
  if (isSalesRepBusy(salesRepId) && entry.assignedSalesRepId !== salesRepId) {
    return null; // Sales rep is already handling another call
  }
  
  const updatedEntry: CallQueueEntry = {
    ...entry,
    assignedSalesRepId: salesRepId
  };
  callQueue.set(shopperId, updatedEntry);
  
  // Notify the shopper that their call has been answered
  if (entry.shopperSocket && entry.shopperSocket.readyState === 1) { // WebSocket.OPEN
    try {
      entry.shopperSocket.send(
        JSON.stringify({
          type: 'call_answered',
          salesRepId: salesRepId,
          message: 'A sales representative has answered your call',
          sdpOffer: sdpOffer,
        })
      );
    } catch (error) {
      console.error(`Failed to notify shopper ${shopperId} of call assignment:`, error);
    }
  }
  
  return updatedEntry;
}

/**
 * Release a call from a sales rep
 */
export function releaseCallFromSalesRep(shopperId: string): CallQueueEntry | null {
  const entry = callQueue.get(shopperId);
  if (!entry) return null;
  
  const previousSalesRepId = entry.assignedSalesRepId;
  
  const updatedEntry: CallQueueEntry = {
    ...entry,
    assignedSalesRepId: undefined
  };
  callQueue.set(shopperId, updatedEntry);
  
  // Notify the shopper that their call has been released (back to queue)
  if (entry.shopperSocket && entry.shopperSocket.readyState === 1) { // WebSocket.OPEN
    try {
      const position = getShopperQueuePosition(shopperId);
      entry.shopperSocket.send(JSON.stringify({
        type: 'call_released',
        previousSalesRepId: previousSalesRepId,
        position: position,
        message: 'Your call has been returned to the queue'
      }));
    } catch (error) {
      console.error(`Failed to notify shopper ${shopperId} of call release:`, error);
    }
  }
  
  return updatedEntry;
}

/**
 * Get current queue summary with calculated ages
 */
export function getCallQueueSummary(): CallQueueSummary[] {
  const now = Date.now();
  return Array.from(callQueue.values()).map(entry => {
    const timeSinceDisconnectedSeconds = entry.disconnectedAt 
      ? Math.floor((now - entry.disconnectedAt) / 1000)
      : undefined;
    
    return {
      shopperId: entry.shopperId,
      connectedAt: entry.connectedAt,
      disconnectedAt: entry.disconnectedAt,
      isConnected: entry.isConnected,
      timeSinceDisconnectedSeconds,
      assignedSalesRepId: entry.assignedSalesRepId,
      hasMicrophone: entry.hasMicrophone
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
 * Get a specific sales rep's WebSocket connection
 */
export function getSalesRepSocket(salesRepId: string): WebSocket | null {
  const connection = salesRepConnections.get(salesRepId);
  return connection?.socket || null;
}

/**
 * Get a specific shopper's WebSocket connection
 */
export function getShopperSocket(shopperId: string): WebSocket | null {
  const entry = callQueue.get(shopperId);
  return entry?.shopperSocket || null;
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

/**
 * Periodic cleanup of old disconnected calls
 * Runs every 30 seconds and removes calls disconnected for more than 60 seconds
 */
function startPeriodicCleanup(): () => void {
  const cleanupInterval = setInterval(() => {
    const cleanedCallsCount = cleanupOldDisconnectedCalls(1); // 1 minute = 60 seconds
    const cleanedCollaborationCount = cleanupExpiredCollaborationRequests();
    
    if (cleanedCallsCount > 0) {
      console.log(`Periodic cleanup: Removed ${cleanedCallsCount} old disconnected calls`);
      // Broadcast updated queue to all sales reps after cleanup
      broadcastQueueUpdate();
    }
    
    if (cleanedCollaborationCount > 0) {
      console.log(`Periodic cleanup: Removed ${cleanedCollaborationCount} expired collaboration requests`);
    }
  }, 30000); // Run every 30 seconds
  
  // Optional: Return cleanup function for testing or shutdown
  return () => clearInterval(cleanupInterval);
}

// Start the periodic cleanup when the module loads
startPeriodicCleanup();
