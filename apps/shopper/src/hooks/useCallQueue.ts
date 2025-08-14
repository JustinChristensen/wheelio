import { useState, useEffect, useRef, useCallback } from 'react';
import { detectMediaCapabilities } from '../utils/media-detection';

export interface CallQueueState {
  status: 'disconnected' | 'connecting' | 'in-queue' | 'connected-to-rep' | 'error';
  position?: number;
  shopperId?: string;
  assignedSalesRepId?: string;
  error?: string;
  lastMessage?: string; // Add this to store the latest status message
  hasMicrophone?: boolean; // Add microphone detection result
}

interface CallQueueMessage {
  type: 'connected' | 'queue_joined' | 'queue_left' | 'call_claimed' | 'call_answered' | 'call_released' | 'error';
  shopperId?: string;
  position?: number;
  salesRepId?: string;
  previousSalesRepId?: string;
  message?: string;
  hasMicrophone?: boolean;
}

export const useCallQueue = () => {
  const [callState, setCallState] = useState<CallQueueState>({ status: 'disconnected' });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const generateShopperId = useCallback(() => {
    return `shopper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
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
      const wsUrl = `${protocol}//${window.location.hostname}:3000/ws/call`;
      
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
            case 'call_answered':
              setCallState(prev => ({
                ...prev,
                status: 'connected-to-rep',
                assignedSalesRepId: data.salesRepId,
                lastMessage: data.message
              }));
              break;
              
            case 'call_released':
              setCallState(prev => ({
                ...prev,
                status: 'in-queue',
                position: data.position,
                assignedSalesRepId: undefined,
                lastMessage: data.message
              }));
              break;
              
            case 'queue_left':
              setCallState(prev => ({
                ...prev,
                status: 'disconnected',
                position: undefined,
                assignedSalesRepId: undefined
              }));
              break;
              
            case 'error':
              setCallState(prev => ({
                ...prev,
                status: 'error',
                error: data.message || 'Unknown error occurred'
              }));
              break;
              
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
        if (callState.status !== 'disconnected' && reconnectAttempts < maxReconnectAttempts) {
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
  }, [callState.status, reconnectAttempts, generateShopperId]);

  const disconnect = useCallback(() => {
    const currentShopperId = callState.shopperId;
    
    if (wsRef.current && currentShopperId) {
      // Send leave_queue message before closing
      wsRef.current.send(JSON.stringify({
        type: 'leave_queue',
        shopperId: currentShopperId
      }));
    }
    
    cleanup();
    setCallState({ status: 'disconnected' });
    setReconnectAttempts(0);
  }, [callState.shopperId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    callState,
    connect,
    disconnect,
    isConnected: callState.status !== 'disconnected' && callState.status !== 'error'
  };
};
