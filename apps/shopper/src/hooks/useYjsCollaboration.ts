import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface UseYjsCollaborationOptions {
  shopperId: string;
  enabled: boolean;
}

export function useYjsCollaboration({ shopperId, enabled }: UseYjsCollaborationOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

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
        setIsConnected(false);
      }
      return;
    }

    // Create Y.js document
    const doc = new Y.Doc();
    docRef.current = doc;

    // Create WebSocket provider
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:4200/api/ws/collaboration`;
    const provider = new WebsocketProvider(wsUrl, shopperId, doc);
    providerRef.current = provider;

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
      if (provider) {
        provider.destroy();
      }
      if (doc) {
        doc.destroy();
      }
      docRef.current = null;
      providerRef.current = null;
      setIsConnected(false);
    };
  }, [shopperId, enabled]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    isConnected,
  };
}
