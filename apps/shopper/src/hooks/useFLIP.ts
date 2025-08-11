import { useRef, useLayoutEffect, useCallback } from 'react';

interface FLIPState {
  [key: string]: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const useFLIP = <T>(items: T[], getItemKey: (item: T) => string) => {
  const firstStateRef = useRef<FLIPState>({});
  const elementRefs = useRef<{ [key: string]: HTMLElement }>({});

  // Register element ref
  const registerElement = useCallback((key: string, element: HTMLElement | null) => {
    if (element) {
      elementRefs.current[key] = element;
    } else {
      delete elementRefs.current[key];
    }
  }, []);

  // Capture first state (before DOM changes)
  const captureFirst = useCallback(() => {
    firstStateRef.current = {};
    Object.entries(elementRefs.current).forEach(([key, element]) => {
      const rect = element.getBoundingClientRect();
      firstStateRef.current[key] = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
  }, []);

  // Apply FLIP animation after DOM has updated
  useLayoutEffect(() => {
    const firstState = firstStateRef.current;
    
    // If no first state captured, skip animation
    if (Object.keys(firstState).length === 0) {
      return;
    }

    const animations: Animation[] = [];

    // Calculate and apply transformations
    Object.entries(elementRefs.current).forEach(([key, element]) => {
      const first = firstState[key];
      if (!first) return;

      const last = element.getBoundingClientRect();
      
      const deltaX = first.x - last.x;
      const deltaY = first.y - last.y;
      const deltaW = first.width / last.width;
      const deltaH = first.height / last.height;

      // Only animate if there's a meaningful change
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        // Apply initial transform immediately
        element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${deltaW}, ${deltaH})`;
        element.style.transition = 'none';

        // Force a repaint
        void element.offsetHeight;

        // Animate to final position
        const animation = element.animate([
          {
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${deltaW}, ${deltaH})`,
          },
          {
            transform: 'translate3d(0, 0, 0) scale(1, 1)',
          }
        ], {
          duration: 300,
          easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
          fill: 'both'
        });

        animations.push(animation);

        animation.addEventListener('finish', () => {
          element.style.transform = '';
          element.style.transition = '';
        });
      }
    });

    // Clear first state after animations are set up
    firstStateRef.current = {};

    return () => {
      animations.forEach(animation => animation.cancel());
    };
  }, [items]);

  return {
    registerElement,
    captureFirst,
  };
};
