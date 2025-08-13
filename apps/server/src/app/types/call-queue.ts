import WebSocket from 'ws';

export interface CallQueueEntry {
  shopperId: string;
  shopperSocket: WebSocket;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  assignedSalesRepId?: string;
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
  ageInSeconds: number;
  timeSinceDisconnectedSeconds?: number;
  assignedSalesRepId?: string;
}

export interface ShopperMessage {
  type: 'join_queue' | 'leave_queue';
  shopperId: string;
}

export interface SalesRepMessage {
  type: 'connect' | 'claim_call' | 'release_call';
  salesRepId: string;
  shopperId?: string; // For claim_call and release_call
}

