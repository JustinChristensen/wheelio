import WebSocket from 'ws';

export interface MediaCapabilities {
  hasAudioInput: boolean;
  audioInputDevices: number;
  detectionError?: string;
  detectedAt: Date;
}

export interface CallQueueEntry {
  shopperId: string;
  shopperSocket: WebSocket;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  assignedSalesRepId?: string;
  // Media capabilities for connection method determination
  hasMicrophone: boolean;
  mediaCapabilities: MediaCapabilities;
}

export interface SalesRepConnection {
  salesRepId: string;
  socket: WebSocket;
  connectedAt: number;
}

export interface CallQueueUpdate {
  type: 'queue_update';
  queue: CallQueueSummary[];
}

export interface CallQueueSummary {
  shopperId: string;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  ageInSeconds?: number; // Optional - calculated on client side
  timeSinceDisconnectedSeconds?: number;
  assignedSalesRepId?: string;
  // Simple microphone indicator for sales rep UI
  hasMicrophone: boolean;
}

export interface ShopperMessage {
  type: 'join_queue' | 'leave_queue'
  shopperId: string;
  // Media capabilities detected on client before joining queue
  mediaCapabilities?: MediaCapabilities;
  // WebRTC signaling data
  sdp?: string;
}

export interface SalesRepMessage {
  type: 'connect' | 'claim_call' | 'release_call'
  salesRepId: string;
  shopperId?: string; // For claim_call and release_call
  // WebRTC signaling data
  sdp?: string;
}

