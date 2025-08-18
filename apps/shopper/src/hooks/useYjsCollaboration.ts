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
      return;
    }

    // Create Y.js document
    const doc = new Y.Doc();
    docRef.current = doc;

    // Create WebSocket provider
    const wsUrl = `ws://localhost:4200/api/ws/calls/collaboration`;
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

    // Add a simple test map to verify bidirectional connection
    const testMap = doc.getMap('test');
    testMap.observe((event) => {
      console.log('Y.js test map changed:', event.changes.keys);
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          console.log(`Key "${key}" ${change.action}ed with value:`, testMap.get(key));
        }
      });
    });

    // Set a test value to verify connection (with role identifier)
    const timestamp = Date.now();
    testMap.set('lastUpdate', timestamp);
    testMap.set('updatedBy', 'shopper'); // or 'salesRep' depending on who's connecting
    
    console.log('Y.js document created and connected for shopper:', shopperId);

    return () => {
      console.log('Cleaning up Y.js collaboration for shopper:', shopperId);
      provider.destroy();
      doc.destroy();
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
