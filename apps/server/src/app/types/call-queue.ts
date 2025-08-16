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
  type: 'join_queue' | 'leave_queue' | 'sdp_answer' | 'ice_candidate' | 'end_call' | 'collaboration_response'
  shopperId: string;
  // Media capabilities detected on client before joining queue
  mediaCapabilities?: MediaCapabilities;
  // WebRTC signaling data
  sdpOffer?: RTCSessionDescriptionInit;
  sdpAnswer?: RTCSessionDescriptionInit;
  iceCandidate?: RTCIceCandidateInit;
  // Collaboration data
  salesRepId?: string; // For collaboration_response
  accepted?: boolean; // For collaboration_response
}

export interface SalesRepMessage {
  type: 'connect' | 'claim_call' | 'release_call' | 'sdp_answer' | 'ice_candidate' | 'request_collaboration'
  salesRepId: string;
  shopperId?: string; // For claim_call, release_call, sdp_answer, ice_candidate, and request_collaboration
  // WebRTC signaling data
  sdpOffer?: RTCSessionDescriptionInit;
  sdpAnswer?: RTCSessionDescriptionInit;
  iceCandidate?: RTCIceCandidateInit;
}

// Collaboration-specific message types
export interface CollaborationRequestMessage {
  type: 'collaboration_request';
  shopperId: string;
  salesRepId: string;
  salesRepName?: string;
}

export interface CollaborationResponseMessage {
  type: 'collaboration_response';
  shopperId: string;
  salesRepId: string;
  accepted: boolean;
}

export interface CollaborationStatusMessage {
  type: 'collaboration_status';
  shopperId: string;
  salesRepId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'ended';
}

// Union type for all collaboration messages
export type CollaborationMessage = 
  | CollaborationRequestMessage 
  | CollaborationResponseMessage 
  | CollaborationStatusMessage;

