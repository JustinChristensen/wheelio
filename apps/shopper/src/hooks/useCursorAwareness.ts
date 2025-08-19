import { useEffect, useCallback, useState, useRef } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import type { CursorPosition } from './useYjsCollaboration';

interface UseCursorAwarenessOptions {
  awareness: Awareness | null;
  enabled: boolean;
  role: 'shopper' | 'salesRep';
  containerRef: React.RefObject<HTMLElement | null>;
}

interface RemoteCursor {
  clientId: number;
  position: CursorPosition;
}

export function useCursorAwareness({ awareness, enabled, role, containerRef }: UseCursorAwarenessOptions) {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const ownClientIdRef = useRef<number | null>(null);
  
  // Generate a consistent color for this role
  const roleColor = role === 'shopper' ? '#3B82F6' : '#10B981'; // Blue for shopper, green for sales rep

  // Update cursor position in awareness
  const updateCursorPosition = useCallback((x: number, y: number) => {
    if (!awareness || !enabled) return;
    
    const cursorData: CursorPosition = {
      x,
      y,
      color: roleColor,
      role,
      timestamp: Date.now()
    };
    
    awareness.setLocalStateField('cursor', cursorData);
  }, [awareness, enabled, role, roleColor]);

  // Clear cursor position from awareness
  const clearCursor = useCallback(() => {
    if (!awareness) return;
    awareness.setLocalStateField('cursor', null);
  }, [awareness]);

  // Set up mouse tracking
  useEffect(() => {
    if (!enabled || !containerRef.current || !awareness) return;

    const container = containerRef.current;
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      updateCursorPosition(x, y);
    };

    const handleMouseLeave = () => {
      clearCursor();
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      clearCursor();
    };
  }, [enabled, containerRef, awareness, updateCursorPosition, clearCursor]);

  // Listen for awareness changes to track remote cursors
  useEffect(() => {
    if (!awareness || !enabled) {
      setRemoteCursors([]);
      return;
    }

    // Store our own client ID
    ownClientIdRef.current = awareness.doc?.clientID || null;

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const cursors: RemoteCursor[] = [];

      states.forEach((state, clientId) => {
        // Skip our own cursor
        if (clientId === ownClientIdRef.current) return;
        
        // Check if this client has a cursor position
        if (state.cursor) {
          cursors.push({
            clientId,
            position: state.cursor as CursorPosition
          });
        }
      });

      setRemoteCursors(cursors);
    };

    awareness.on('change', handleAwarenessChange);

    return () => {
      awareness.off('change', handleAwarenessChange);
      setRemoteCursors([]);
    };
  }, [awareness, enabled]);

  return {
    remoteCursors,
    updateCursorPosition,
    clearCursor
  };
}
