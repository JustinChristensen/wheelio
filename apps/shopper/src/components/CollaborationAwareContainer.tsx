import React, { useRef } from 'react';
import { useCursorAwareness } from '../hooks/useCursorAwareness';
import { CursorOverlay } from './CursorOverlay/CursorOverlay';
import type { Awareness } from 'y-protocols/awareness';

interface CollaborationAwareContainerProps {
  children: React.ReactNode;
  awareness: Awareness | null;
  enabled: boolean;
  role: 'shopper' | 'salesRep';
  className?: string;
}

export function CollaborationAwareContainer({ 
  children, 
  awareness, 
  enabled, 
  role, 
  className = '' 
}: CollaborationAwareContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { remoteCursors } = useCursorAwareness({
    awareness,
    enabled,
    role,
    containerRef
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      {enabled && (
        <CursorOverlay 
          cursors={remoteCursors} 
          containerRef={containerRef} 
        />
      )}
    </div>
  );
}
