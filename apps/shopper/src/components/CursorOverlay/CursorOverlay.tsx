import React from 'react';
import type { CursorPosition } from '../hooks/useYjsCollaboration';

interface RemoteCursor {
  clientId: number;
  position: CursorPosition;
}

interface CursorOverlayProps {
  cursors: RemoteCursor[];
  containerRef: React.RefObject<HTMLElement>;
}

export function CursorOverlay({ cursors, containerRef }: CursorOverlayProps) {
  if (!containerRef.current || cursors.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {cursors.map(({ clientId, position }) => (
        <div
          key={clientId}
          className="absolute transition-transform duration-100 ease-out"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor dot */}
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: position.color }}
          />
          
          {/* Role label */}
          <div
            className="absolute top-4 left-0 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
            style={{ backgroundColor: position.color }}
          >
            {position.role === 'shopper' ? 'Customer' : 'Sales Rep'}
          </div>
        </div>
      ))}
    </div>
  );
}
