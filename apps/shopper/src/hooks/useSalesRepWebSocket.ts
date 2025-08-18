import { useState, useEffect, useRef, useCallback } from 'react';
import { detectMediaCapabilities } from '../utils/media-detection';
import { useYjsCollaboration } from './useYjsCollaboration';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

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
  // Collaboration features
  requestCollaboration: (shopperId: string) => void;
  collaborationStatus: 'none' | 'pending' | 'accepted' | 'rejected' | 'ended';
  collaborationError: string | null;
  // Y.js collaboration
  yjsDoc: Y.Doc | null;
  yjsProvider: WebsocketProvider | null;
  isYjsConnected: boolean;
}

export function useSalesRepWebSocket(salesRepId: string): UseSalesRepWebSocketReturn {
  const [queue, setQueue] = useState<CallQueueSummary[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [currentCall, setCurrentCall] = useState<CallQueueSummary | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  
  // Collaboration state
  const [collaborationStatus, setCollaborationStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected' | 'ended'>('none');
  const [collaborationError, setCollaborationError] = useState<string | null>(null);
  
  // WebRTC related state
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  // Use refs for WebRTC objects since they don't trigger re-renders
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentCallRef = useRef<CallQueueSummary | null>(null);

  // Y.js collaboration hook
  const yjsCollaboration = useYjsCollaboration({
    shopperId: currentCall?.shopperId || '',
    enabled: collaborationStatus === 'accepted'
  });

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

      // Set up ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
          // Send ICE candidate to the current shopper if we have a call in progress
          if (currentCallRef.current) {
            socketRef.current.send(JSON.stringify({
              type: 'ice_candidate',
              salesRepId,
              shopperId: currentCallRef.current.shopperId,
              iceCandidate: event.candidate.toJSON()
            }));
            console.log('Sent ICE candidate to shopper:', event.candidate);
          }
        }
      };

      // Handle remote audio stream from shopper
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        
        if (event.track.kind === 'audio') {
          // Create or get existing audio element for remote audio
          let audioElement = document.getElementById('remote-shopper-audio') as HTMLAudioElement;
          
          if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = 'remote-shopper-audio';
            audioElement.autoplay = true;
            audioElement.style.display = 'none'; // Hide the audio element
            document.body.appendChild(audioElement);
          }
          
          // Set the remote stream
          audioElement.srcObject = event.streams[0];
          console.log('Remote shopper audio stream connected');
        } else {
          // Error: unexpected track type
          console.error(`Unexpected track type received: ${event.track.kind}. Expected audio only.`);
          setError(`Unexpected media type received: ${event.track.kind}. Audio connection failed.`);
        }
      };

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
  }, [salesRepId]); // Now only depends on salesRepId

  // Keep currentCallRef in sync with currentCall state
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

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
    
    // Clean up audio elements when releasing the call
    const audioElement = document.getElementById('remote-shopper-audio');
    if (audioElement) {
      audioElement.remove();
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      localStreamRef.current = null;
    }
    
    setIsMediaReady(false);
  }, [salesRepId]);

  const requestCollaboration = useCallback((shopperId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      // Clear any previous collaboration error
      setCollaborationError(null);
      
      // Send collaboration request
      socketRef.current.send(JSON.stringify({
        type: 'request_collaboration',
        salesRepId,
        shopperId
      }));
      
      // Set status to pending
      setCollaborationStatus('pending');
    } else {
      setCollaborationError('Not connected to server');
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
      const wsUrl = `${protocol}//${window.location.hostname}:4200/api/ws/calls/monitor`;

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
                // Reset collaboration status when call is released
                setCollaborationStatus('none');
                setCollaborationError(null);
              }
              break;
            }
            case 'call_ended_by_shopper': {
              console.log('Call ended by shopper:', data);
              // If this sales rep's call was ended by the shopper, clean up
              if (data.salesRepId === salesRepId) {
                // Clean up audio elements
                const audioElement = document.getElementById('remote-shopper-audio');
                if (audioElement) {
                  audioElement.remove();
                }
                
                // Close peer connection
                if (peerConnectionRef.current) {
                  peerConnectionRef.current.close();
                  peerConnectionRef.current = null;
                }
                
                // Stop local streams
                if (localStreamRef.current) {
                  localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                  localStreamRef.current = null;
                }
                
                setIsMediaReady(false);
                setCurrentCall(null);
                setIsBusy(false);
                setError(null);
                // Reset collaboration status when call ends
                setCollaborationStatus('none');
                setCollaborationError(null);
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
            case 'ice_candidate': {
              console.log('Received ICE candidate from shopper:', data);
              // Add the ICE candidate to the peer connection
              if (peerConnectionRef.current && data.iceCandidate) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.iceCandidate))
                  .then(() => {
                    console.log('Successfully added ICE candidate');
                  }, (error) => {
                    console.error('Failed to add ICE candidate:', error);
                    setError(`Failed to add connection candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            case 'collaboration_status': {
              // Handle collaboration status updates
              if (data.salesRepId === salesRepId) {
                setCollaborationStatus(data.status);
                setCollaborationError(null);
                console.log('Collaboration status updated:', data.status);
              }
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
      
      // Clean up remote audio element
      const audioElement = document.getElementById('remote-shopper-audio');
      if (audioElement) {
        audioElement.remove();
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
    isBusy,
    // Collaboration features
    requestCollaboration,
    collaborationStatus,
    collaborationError,
    // Y.js collaboration
    yjsDoc: yjsCollaboration.doc,
    yjsProvider: yjsCollaboration.provider,
    isYjsConnected: yjsCollaboration.isConnected
  };
}
