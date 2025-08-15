import { useState, useEffect, useRef, useCallback } from 'react';
import { detectMediaCapabilities } from '../utils/media-detection';

export interface CallQueueSummary {
  shopperId: string;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  timeSinceDisconnectedSeconds?: number;
  assignedSalesRepId?: string;
  hasMicrophone: boolean;
}

interface UseSalesRepWebSocketReturn {
  queue: CallQueueSummary[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  claimCall: (shopperId: string) => void;
  releaseCall: (shopperId: string) => void;
  currentCall: CallQueueSummary | null;
  isBusy: boolean;
}

export function useSalesRepWebSocket(salesRepId: string): UseSalesRepWebSocketReturn {
  const [queue, setQueue] = useState<CallQueueSummary[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [currentCall, setCurrentCall] = useState<CallQueueSummary | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  
  // WebRTC related state
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  // Use refs for WebRTC objects since they don't trigger re-renders
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebRTC with media detection
  const initializeWebRTC = useCallback(async (): Promise<RTCPeerConnection | null> => {
    try {
      // Detect media capabilities first
      const capabilities = await detectMediaCapabilities();

      if (!capabilities.hasAudioInput) {
        throw new Error('No audio input available for WebRTC');
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      // Add audio tracks to peer connection
      stream.getAudioTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      localStreamRef.current = stream;
      peerConnectionRef.current = pc;
      setIsMediaReady(true);

      console.log('WebRTC initialized successfully');
      return pc;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      setError(`WebRTC initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsMediaReady(false);
      return null;
    }
  }, []);

  const claimCall = useCallback(async (shopperId: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Initialize WebRTC if not already ready
      let pc = peerConnectionRef.current;
      if (!pc || !isMediaReady) {
        pc = await initializeWebRTC();
        if (!pc) {
          throw new Error('Failed to initialize WebRTC');
        }
      }

      // Create an offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });

      // Set local description
      await pc.setLocalDescription(offer);

      // Send claim call message with SDP offer
      socketRef.current.send(JSON.stringify({
        type: 'claim_call',
        salesRepId,
        shopperId,
        sdpOffer: offer
      }));

      console.log('Claim call sent with SDP offer');
    } catch (error) {
      console.error('Failed to claim call with WebRTC offer:', error);
      setError(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [salesRepId, isMediaReady, initializeWebRTC]);

  const releaseCall = useCallback((shopperId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'release_call',
        salesRepId,
        shopperId
      }));
    }
  }, [salesRepId]);

  useEffect(() => {
    // Connection logic moved directly into useEffect to avoid dependency issues
    const connectWebSocket = () => {
      // Prevent multiple connections - if socket already exists, don't create another
      if (socketRef.current) {
        return;
      }

      setConnectionStatus('connecting');
      setError(null);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3000/ws/calls/monitor`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        
        // Send connect message to identify as sales rep
        socket.send(JSON.stringify({
          type: 'connect',
          salesRepId
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'queue_update': {
              setQueue(data.queue);
              // Update current call status based on queue data
              const myAssignedCall = data.queue.find((call: CallQueueSummary) => 
                call.assignedSalesRepId === salesRepId
              );
              setCurrentCall(myAssignedCall || null);
              setIsBusy(!!myAssignedCall);
              break;
            }
            case 'connected': {
              console.log('Sales rep connected:', data.message);
              break;
            }
            case 'call_claimed': {
              console.log('Call claimed:', data);
              // If this sales rep claimed the call, update their busy status immediately
              if (data.salesRepId === salesRepId) {
                setIsBusy(true);
              }
              break;
            }
            case 'call_released': {
              console.log('Call released:', data);
              // If this sales rep released the call, update their busy status immediately
              if (data.salesRepId === salesRepId) {
                setCurrentCall(null);
                setIsBusy(false);
              }
              break;
            }
            case 'sdp_answer': {
              console.log('Received SDP answer from shopper:', data, peerConnectionRef.current);
              // Configure the peer connection with the shopper's SDP answer
              if (peerConnectionRef.current && data.sdpAnswer) {
                peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdpAnswer))
                  .then(() => {
                    console.log('Successfully set remote description with SDP answer');
                  }, (error) => {
                    console.error('Failed to set remote description:', error);
                    setError(`Failed to establish WebRTC connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  });
              }
              break;
            }
            case 'status_update': {
              // Handle status updates from the server
              if (data.salesRepId === salesRepId) {
                setCurrentCall(data.currentCall);
                setIsBusy(data.isBusy);
              }
              break;
            }
            case 'error': {
              setError(data.message);
              break;
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        socketRef.current = null; // Clear the ref so reconnection can happen
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('error');
      };
    };

    connectWebSocket();

    return () => {
      console.log('running cleanup')
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [salesRepId]); // Remove peerConnection dependency since it's now a ref

  // Separate useEffect for WebRTC cleanup
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []); // No dependencies needed since refs don't change

  return {
    queue,
    isConnected,
    connectionStatus,
    error,
    claimCall,
    releaseCall,
    currentCall,
    isBusy
  };
}
