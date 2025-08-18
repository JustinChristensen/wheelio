import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { detectMediaCapabilities } from '../utils/media-detection';
import { useYjsCollaboration } from '../hooks/useYjsCollaboration';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface CallQueueState {
  status: 'disconnected' | 'connecting' | 'in-queue' | 'connected-to-rep' | 'error';
  position?: number;
  shopperId?: string;
  assignedSalesRepId?: string;
  error?: string;
  lastMessage?: string;
  hasMicrophone?: boolean;
  // Collaboration state
  collaborationRequest?: {
    salesRepId?: string;
    salesRepName?: string;
  };
  collaborationStatus?: 'none' | 'pending' | 'accepted' | 'rejected' | 'ended';
}

interface CallQueueMessage {
  type: 'connected' | 'queue_joined' | 'queue_left' | 'call_claimed' | 'call_answered' | 'call_released' | 'error' | 'sdp_answer' | 'ice_candidate' | 'end_call' | 'call_ended' | 'collaboration_request' | 'collaboration_status';
  shopperId?: string;
  position?: number;
  salesRepId?: string;
  previousSalesRepId?: string;
  message?: string;
  hasMicrophone?: boolean;
  sdpOffer?: RTCSessionDescriptionInit;
  sdpAnswer?: RTCSessionDescriptionInit;
  iceCandidate?: RTCIceCandidateInit;
  // Collaboration fields
  salesRepName?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'ended';
}

interface CallQueueContextType {
  callState: CallQueueState;
  connect: () => Promise<void>;
  disconnect: () => void;
  endCall: () => void;
  acceptCollaboration: () => void;
  declineCollaboration: () => void;
  isConnected: boolean;
  peerConnection: RTCPeerConnection | null;
  // Y.js collaboration
  yjsDoc: Y.Doc | null;
  yjsProvider: WebsocketProvider | null;
  isYjsConnected: boolean;
}

const CallQueueContext = createContext<CallQueueContextType | undefined>(undefined);

interface CallQueueProviderProps {
  children: ReactNode;
}

export const CallQueueProvider: React.FC<CallQueueProviderProps> = ({ children }) => {
  const [callState, setCallState] = useState<CallQueueState>({ 
    status: 'disconnected',
    collaborationStatus: 'none'
  });
  const callStateRef = useRef<CallQueueState>({ 
    status: 'disconnected',
    collaborationStatus: 'none'
  });
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Y.js collaboration hook
  const yjsCollaboration = useYjsCollaboration({
    shopperId: callState.shopperId || '',
    enabled: callState.collaborationStatus === 'accepted'
  });

  // Keep ref in sync with state
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const generateShopperId = useCallback(() => {
    return `shopper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Set up event handlers
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      
      if (event.track.kind === 'audio') {
        // Create or get existing audio element for remote audio
        let audioElement = document.getElementById('remote-salesrep-audio') as HTMLAudioElement;
        
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.id = 'remote-salesrep-audio';
          audioElement.autoplay = true;
          audioElement.style.display = 'none'; // Hide the audio element
          document.body.appendChild(audioElement);
        }
        
        // Set the remote stream
        audioElement.srcObject = event.streams[0];
        console.log('Remote sales rep audio stream connected');
      } else {
        // Error: unexpected track type
        console.error(`Unexpected track type received: ${event.track.kind}. Expected audio only.`);
        setCallState(prev => ({
          ...prev,
          status: 'error',
          error: `Unexpected media type received: ${event.track.kind}. Audio connection failed.`
        }));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        // Send ICE candidate to sales rep
        if (callStateRef.current.shopperId) {
          wsRef.current.send(JSON.stringify({
            type: 'ice_candidate',
            shopperId: callStateRef.current.shopperId,
            iceCandidate: event.candidate.toJSON()
          }));
          console.log('Sent ICE candidate to sales rep:', event.candidate);
        }
      }
    };

    return pc;
  }, []);

  const handleSdpOffer = useCallback(async (sdpOffer: string) => {
    try {
      // Create new peer connection if needed
      if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection();
      }

      const pc = peerConnectionRef.current;

      // Set the remote description (SDP offer from sales rep)
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: sdpOffer
      }));

      // Get user media if we have microphone access
      if (callStateRef.current.hasMicrophone) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        } catch (error) {
          console.warn('Failed to get user media:', error);
        }
      }

      // Create and set local description (SDP answer)
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send SDP answer back to sales rep via WebSocket
      if (wsRef.current && callStateRef.current.shopperId) {
        wsRef.current.send(JSON.stringify({
          type: 'sdp_answer',
          shopperId: callStateRef.current.shopperId,
          sdpAnswer: pc.localDescription
        }));

        console.log('SDP answer sent to sales rep');
      }
    } catch (error) {
      console.error('Failed to handle SDP offer:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to establish audio connection'
      }));
    }
  }, [createPeerConnection]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clean up remote audio element
    const audioElement = document.getElementById('remote-salesrep-audio');
    if (audioElement) {
      audioElement.remove();
    }
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setCallState(prev => ({ ...prev, status: 'connecting' }));

    try {
      // Detect media capabilities before joining queue
      const mediaCapabilities = await detectMediaCapabilities();
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:4200/api/ws/call`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setReconnectAttempts(0);
        
        // Generate shopper ID and join queue with media capabilities
        const shopperId = generateShopperId();
        setCallState(prev => ({ 
          ...prev, 
          shopperId, 
          status: 'connecting',
          hasMicrophone: mediaCapabilities.hasAudioInput 
        }));
        
        ws.send(JSON.stringify({
          type: 'join_queue',
          shopperId,
          mediaCapabilities
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: CallQueueMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              // Just acknowledgment, wait for queue_joined
              break;
              
            case 'queue_joined':
              setCallState(prev => ({
                ...prev,
                status: 'in-queue',
                position: data.position,
                shopperId: data.shopperId,
                hasMicrophone: data.hasMicrophone
              }));
              break;
              
            case 'call_claimed':
              setCallState(prev => ({
                ...prev,
                status: 'connected-to-rep',
                assignedSalesRepId: data.salesRepId,
                lastMessage: data.message
              }));
              break;
              
            case 'call_answered':
              setCallState(prev => ({
                ...prev,
                status: 'connected-to-rep',
                assignedSalesRepId: data.salesRepId,
                lastMessage: data.message
              }));

              // Handle SDP offer if provided
              if (data.sdpOffer?.sdp) {
                handleSdpOffer(data.sdpOffer.sdp);
              }
              break;
              
            case 'call_released': {
              setCallState(prev => ({
                ...prev,
                status: 'in-queue',
                position: data.position,
                assignedSalesRepId: undefined,
                lastMessage: data.message,
                // Reset collaboration state when call is released
                collaborationStatus: 'none',
                collaborationRequest: undefined
              }));
              
              // Clean up WebRTC connection when call is released
              if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
              }
              
              // Clean up remote audio element
              const audioElement = document.getElementById('remote-salesrep-audio');
              if (audioElement) {
                audioElement.remove();
              }
              break;
            }
              
            case 'queue_left':
              setCallState(prev => ({
                ...prev,
                status: 'disconnected',
                position: undefined,
                assignedSalesRepId: undefined
              }));
              break;
              
            case 'ice_candidate': {
              console.log('Received ICE candidate from sales rep:', data);
              // Add the ICE candidate to the peer connection
              if (peerConnectionRef.current && data.iceCandidate) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.iceCandidate))
                  .then(() => {
                    console.log('Successfully added ICE candidate');
                  }, (error) => {
                    console.error('Failed to add ICE candidate:', error);
                    setCallState(prev => ({
                      ...prev,
                      status: 'error',
                      error: 'Failed to establish connection with sales representative'
                    }));
                  });
              }
              break;
            }
              
            case 'call_ended': {
              console.log('Call ended confirmation received from server');
              // Server confirmation that call was ended - state should already be updated by endCall
              break;
            }
              
            case 'error':
              setCallState(prev => ({
                ...prev,
                status: 'error',
                error: data.message || 'Unknown error occurred'
              }));
              break;

            case 'collaboration_request': {
              if (data.salesRepId && data.salesRepName) {
                setCallState(prev => ({
                  ...prev,
                  collaborationRequest: {
                    salesRepId: data.salesRepId,
                    salesRepName: data.salesRepName
                  },
                  collaborationStatus: 'pending'
                }));
              }
              break;
            }

            case 'collaboration_status': {
              console.log('Received collaboration status update:', data);
              if (data.status) {
                setCallState(prev => ({
                  ...prev,
                  collaborationStatus: data.status as 'pending' | 'accepted' | 'rejected' | 'ended',
                  // Clear request if collaboration ended or was rejected
                  collaborationRequest: (data.status === 'ended' || data.status === 'rejected') 
                    ? undefined 
                    : prev.collaborationRequest
                }));
              }
              break;
            }
              
            default:
              console.warn('Unknown call queue message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse call queue message:', error);
        }
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        
        // Only attempt reconnect if we were previously connected and it wasn't a manual disconnect
        if (callStateRef.current.status !== 'disconnected' && reconnectAttempts < maxReconnectAttempts) {
          setCallState(prev => ({ ...prev, status: 'connecting' }));
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else {
          setCallState(prev => ({ 
            ...prev, 
            status: 'disconnected',
            position: undefined,
            assignedSalesRepId: undefined
          }));
        }
      };

      ws.onerror = (error) => {
        setCallState(prev => ({
          ...prev,
          status: 'error',
          error: 'Connection failed'
        }));
      };

    } catch {
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to connect to call service'
      }));
    }
  }, [reconnectAttempts, generateShopperId, handleSdpOffer]);

  const disconnect = useCallback(() => {
    const currentShopperId = callStateRef.current.shopperId;
    
    if (wsRef.current && currentShopperId) {
      // Send leave_queue message before closing
      wsRef.current.send(JSON.stringify({
        type: 'leave_queue',
        shopperId: currentShopperId
      }));
    }
    
    cleanup();
    setCallState({ status: 'disconnected', collaborationStatus: 'none' });
    setReconnectAttempts(0);
  }, [cleanup]);

  const endCall = useCallback(() => {
    const currentShopperId = callStateRef.current.shopperId;
    
    // Clean up WebRTC connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clean up and remove remote audio element
    const audioElement = document.getElementById('remote-salesrep-audio') as HTMLAudioElement;
    if (audioElement) {
      // Stop the audio stream
      if (audioElement.srcObject) {
        const stream = audioElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        audioElement.srcObject = null;
      }
      audioElement.remove();
    }
    
    // Notify server that call is ending (this will release the call on server side)
    if (wsRef.current?.readyState === WebSocket.OPEN && currentShopperId) {
      wsRef.current.send(JSON.stringify({
        type: 'end_call',
        shopperId: currentShopperId
      }));
    }
    
    // Update state back to in-queue
    setCallState(prev => ({
      ...prev,
      status: 'in-queue',
      assignedSalesRepId: undefined,
      lastMessage: 'Call ended',
      // Reset collaboration state when call ends
      collaborationStatus: 'none',
      collaborationRequest: undefined
    }));
    
    console.log('Call ended by shopper');
  }, []);

  // Collaboration functions
  const respondToCollaboration = useCallback((accepted: boolean) => {
    const currentShopperId = callStateRef.current.shopperId;
    const salesRepId = callStateRef.current.collaborationRequest?.salesRepId;
    
    if (wsRef.current?.readyState === WebSocket.OPEN && currentShopperId && salesRepId) {
      wsRef.current.send(JSON.stringify({
        type: 'collaboration_response',
        shopperId: currentShopperId,
        salesRepId,
        accepted
      }));
      
      // Update local state immediately
      setCallState(prev => ({
        ...prev,
        collaborationStatus: accepted ? 'accepted' : 'rejected',
        collaborationRequest: accepted ? prev.collaborationRequest : undefined
      }));
      
      console.log(`Collaboration ${accepted ? 'accepted' : 'rejected'}`);
    }
  }, []);

  const acceptCollaboration = useCallback(() => {
    respondToCollaboration(true);
  }, [respondToCollaboration]);

  const declineCollaboration = useCallback(() => {
    respondToCollaboration(false);
  }, [respondToCollaboration]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const value: CallQueueContextType = {
    callState,
    connect,
    disconnect,
    endCall,
    acceptCollaboration,
    declineCollaboration,
    isConnected: callState.status !== 'disconnected' && callState.status !== 'error',
    peerConnection: peerConnectionRef.current,
    // Y.js collaboration
    yjsDoc: yjsCollaboration.doc,
    yjsProvider: yjsCollaboration.provider,
    isYjsConnected: yjsCollaboration.isConnected
  };

  return (
    <CallQueueContext.Provider value={value}>
      {children}
    </CallQueueContext.Provider>
  );
};

export const useCallQueue = (): CallQueueContextType => {
  const context = useContext(CallQueueContext);
  if (context === undefined) {
    throw new Error('useCallQueue must be used within a CallQueueProvider');
  }
  return context;
};
