import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Awareness } from 'y-protocols/awareness';

interface UseYjsCollaborationOptions {
  shopperId: string;
  enabled: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  color: string;
  role: 'shopper' | 'salesRep';
  timestamp: number;
}

export function useYjsCollaboration({ shopperId, enabled }: UseYjsCollaborationOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
    if (!enabled || !shopperId) {
      // Clean up existing connection if disabled
      if (docRef.current) {
        console.log('Y.js collaboration disabled, cleaning up...');
        if (providerRef.current) {
          providerRef.current.destroy();
          providerRef.current = null;
        }
        docRef.current.destroy();
        docRef.current = null;
        awarenessRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create Y.js document
    const doc = new Y.Doc();
    docRef.current = doc;

    // Create WebSocket provider
    const provider = new WebsocketProvider('/api/ws/collaboration', shopperId, doc);
    providerRef.current = provider;
    
    // Get awareness instance from provider
    const awareness = provider.awareness;
    awarenessRef.current = awareness;

    // Connection event handlers
    provider.on('status', (event: { status: string }) => {
      console.log('Y.js WebSocket status:', event.status);
      setIsConnected(event.status === 'connected');
    });

    provider.on('connection-close', () => {
      console.log('Y.js WebSocket connection closed');
      setIsConnected(false);
    });

    provider.on('connection-error', (error: Event) => {
      console.error('Y.js WebSocket connection error:', error);
      setIsConnected(false);
    });
    
    console.log('Y.js document created and connected for shopper:', shopperId);

    return () => {
      // Clean up awareness first
      if (awareness) {
        awareness.destroy();
      }
      if (provider) {
        provider.destroy();
      }
      if (doc) {
        doc.destroy();
      }
      docRef.current = null;
      providerRef.current = null;
      awarenessRef.current = null;
      setIsConnected(false);
    };
  }, [shopperId, enabled]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    awareness: awarenessRef.current,
    isConnected,
  };
}
