import { useState, useEffect, useRef, useCallback } from 'react';

export interface CallQueueSummary {
  shopperId: string;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  timeSinceDisconnectedSeconds?: number;
  assignedSalesRepId?: string;
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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const claimCall = useCallback((shopperId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'claim_call',
        salesRepId,
        shopperId
      }));
    }
  }, [salesRepId]);

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
  }, [salesRepId]); // Only depend on salesRepId

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
