import { useEffect, useCallback, useRef } from 'react';
import { CarFilters } from 'car-data';
import { useYjsCollaboration } from './useYjsCollaboration';
import * as Y from 'yjs';

interface UseYjsFilterSyncOptions {
  shopperId: string;
  enabled: boolean;
  filters: CarFilters;
  onFiltersChange: (filters: CarFilters) => void;
  role?: 'shopper' | 'salesRep'; // Add role to distinguish between shopper and sales rep
}

/**
 * Hook that synchronizes filter state over Y.js for real-time collaboration.
 * Handles bidirectional sync of filter changes between shopper and sales rep.
 */
export function useYjsFilterSync({ 
  shopperId, 
  enabled, 
  filters, 
  onFiltersChange,
  role = 'shopper' // Default to shopper for backward compatibility
}: UseYjsFilterSyncOptions) {
  const { doc, isConnected } = useYjsCollaboration({ shopperId, enabled });
  const lastUpdateSourceRef = useRef<'local' | 'remote'>('local');
  const filtersMapRef = useRef<Y.Map<unknown> | null>(null);

  // Initialize the filters map and set up observers
  useEffect(() => {
    if (!doc || !enabled) {
      filtersMapRef.current = null;
      return;
    }

    const filtersMap = doc.getMap('filters');
    filtersMapRef.current = filtersMap;

    // Observer for incoming filter changes from remote (sales rep)
    const observer = (event: Y.YMapEvent<unknown>) => {
      // Only process remote changes to avoid feedback loops
      if (lastUpdateSourceRef.current === 'local') {
        lastUpdateSourceRef.current = 'remote';
        return;
      }

      console.log(`[Filter Sync ${role}] Y.js filters changed by remote user:`, event.changes.keys);
      
      // Convert Y.js map back to CarFilters object
      const remoteFilters: CarFilters = {};
      
      // Process each changed key
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const value = filtersMap.get(key);
          console.log(`[Filter Sync ${role}] Remote ${change.action} for "${key}":`, value);
          if (value !== undefined && value !== null) {
            // Handle array values (most filter properties are arrays)
            if (Array.isArray(value)) {
              (remoteFilters as Record<string, unknown>)[key] = [...value];
            } else {
              (remoteFilters as Record<string, unknown>)[key] = value;
            }
          }
        } else if (change.action === 'delete') {
          console.log(`[Filter Sync ${role}] Remote delete for "${key}"`);
          // Key was deleted, so we'll omit it from the filters object
          // (it will be undefined in the resulting object)
        }
      });

      // Get the complete current state from Y.js
      const completeFilters: CarFilters = {};
      filtersMap.forEach((value, key) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            (completeFilters as Record<string, unknown>)[key] = [...value];
          } else {
            (completeFilters as Record<string, unknown>)[key] = value;
          }
        }
      });

      console.log(`[Filter Sync ${role}] Applying remote filter changes:`, completeFilters);
      lastUpdateSourceRef.current = 'remote';
      onFiltersChange(completeFilters);
    };

    filtersMap.observe(observer);

    // Cleanup observer on unmount or when doc changes
    return () => {
      filtersMap.unobserve(observer);
    };
  }, [doc, enabled, onFiltersChange, role]);

  // Function to send local filter changes to Y.js
  const syncFiltersToYjs = useCallback((newFilters: CarFilters) => {
    if (!filtersMapRef.current || !enabled || lastUpdateSourceRef.current === 'remote') {
      // Reset the flag after processing remote changes
      if (lastUpdateSourceRef.current === 'remote') {
        lastUpdateSourceRef.current = 'local';
      }
      return;
    }

    console.log(`[Filter Sync ${role}] Syncing local filters to Y.js:`, newFilters);
    lastUpdateSourceRef.current = 'local';

    const filtersMap = filtersMapRef.current;

    // Get current Y.js state to compare
    const currentKeys = new Set<string>();
    filtersMap.forEach((_, key) => {
      currentKeys.add(key);
    });

    // Update or add new filter values
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // For arrays, create a new array to ensure proper Y.js sync
        if (Array.isArray(value)) {
          console.log(`[Filter Sync ${role}] Setting array key "${key}":`, value);
          filtersMap.set(key, [...value]);
        } else {
          console.log(`[Filter Sync ${role}] Setting scalar key "${key}":`, value);
          filtersMap.set(key, value);
        }
        currentKeys.delete(key); // Mark as handled
      }
    });

    // Remove keys that are no longer in the filters
    currentKeys.forEach(key => {
      console.log(`[Filter Sync ${role}] Removing key "${key}"`);
      filtersMap.delete(key);
    });

    // Set metadata about the update
    if (doc) {
      const metadataMap = doc.getMap('filterMetadata');
      metadataMap.set('lastUpdatedBy', role);
      metadataMap.set('lastUpdatedAt', Date.now());
      metadataMap.set('shopperId', shopperId);
      console.log(`[Filter Sync ${role}] Updated metadata for ${role}:`, shopperId);
    }
  }, [enabled, shopperId, doc, role]);

  // Sync local filter changes to Y.js when filters change
  useEffect(() => {
    if (enabled && isConnected) {
      syncFiltersToYjs(filters);
    }
  }, [filters, enabled, isConnected, syncFiltersToYjs]);

  return {
    isConnected,
    syncFiltersToYjs,
  };
}
