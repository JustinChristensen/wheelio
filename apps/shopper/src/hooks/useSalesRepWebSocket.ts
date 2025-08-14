import { useState, useEffect, useRef, useCallback } from 'react';

export interface CallQueueSummary {
  shopperId: string;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  ageInSeconds: number;
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
}

export function useSalesRepWebSocket(salesRepId: string): UseSalesRepWebSocketReturn {
  const [queue, setQueue] = useState<CallQueueSummary[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
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
          case 'queue_update':
            setQueue(data.queue);
            break;
          case 'connected':
            console.log('Sales rep connected:', data.message);
            break;
          case 'call_claimed':
            console.log('Call claimed:', data);
            break;
          case 'call_released':
            console.log('Call released:', data);
            break;
          case 'error':
            setError(data.message);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      socketRef.current = null;
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
      setConnectionStatus('error');
    };
  }, [salesRepId]);

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
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    queue,
    isConnected,
    connectionStatus,
    error,
    claimCall,
    releaseCall
  };
}
