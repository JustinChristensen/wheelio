import { useState, useEffect } from 'react';
import FilterSidebar from '../FilterSidebar/FilterSidebar';
import CarGrid from '../CarGrid/CarGrid';
import AISalesAgent from '../AISalesAgent/AISalesAgent';
import CollaborationRequestModal from '../CollaborationRequestModal/CollaborationRequestModal';
import { CarFilters } from 'car-data';
import { useCarData } from '../../hooks/useCarData';
import { useYjsFilterSync } from '../../hooks/useYjsFilterSync';
import { CallQueueProvider, useCallQueue } from '../../contexts/CallQueueContext';
import * as Y from 'yjs';

interface ShopperPageProps {
  /** When provided, the component will operate in "impersonation mode" for sales reps */
  impersonateShopperId?: string;
  /** When in impersonation mode, whether the collaboration is active */
  isCollaborationActive?: boolean;
  /** When in impersonation mode, the Y.js document to use */
  yjsDoc?: Y.Doc;
  /** When in impersonation mode, the Y.js connection status */
  isYjsConnected?: boolean;
}

export function ShopperPage(props: ShopperPageProps = {}) {
  return (
    <CallQueueProvider isImpersonationMode={!!props.impersonateShopperId}>
      <ShopperPageContent {...props} />
    </CallQueueProvider>
  );
}

function ShopperPageContent({ 
  impersonateShopperId, 
  isCollaborationActive, 
  yjsDoc: externalYjsDoc, 
  isYjsConnected: externalIsYjsConnected 
}: ShopperPageProps) {
  const [filters, setFilters] = useState<CarFilters>({});
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(true);
  
  // Fetch car data from API
  const { cars, loading, error } = useCarData();
  
  // Call queue context - always available since we're inside the provider
  const callQueueContext = useCallQueue();
  
  // Determine which values to use based on mode
  const shopperId = impersonateShopperId || callQueueContext.callState.shopperId || '';
  const collaborationStatus = isCollaborationActive ? 'accepted' : callQueueContext.callState.collaborationStatus || 'none';
  const yjsDoc = externalYjsDoc || callQueueContext.yjsDoc;
  const isYjsConnected = externalIsYjsConnected ?? callQueueContext.isYjsConnected;

  // Y.js filter synchronization for real-time collaboration
  const { isConnected: isFilterSyncConnected } = useYjsFilterSync({
    shopperId,
    enabled: collaborationStatus === 'accepted',
    filters,
    onFiltersChange: setFilters,
    role: impersonateShopperId ? 'salesRep' : undefined,
  });

  // Test Y.js functionality when connected
  useEffect(() => {
    if (yjsDoc && isYjsConnected && collaborationStatus === 'accepted') {
      const testMap = yjsDoc.getMap('test');
      
      // Add observer for changes
      const observer = (event: { changes: { keys: Map<string, { action: string }> } }) => {
        console.log('Shopper - Y.js test map changed:', event.changes.keys);
        event.changes.keys.forEach((change: { action: string }, key: string) => {
          if (change.action === 'add' || change.action === 'update') {
            console.log(`Shopper - Key "${key}" ${change.action}ed with value:`, testMap.get(key));
          }
        });
      };
      
      testMap.observe(observer);
      
      console.log('Shopper - Y.js document connected for shopper:', shopperId);
      
      return () => {
        testMap.unobserve(observer);
      };
    }
  }, [yjsDoc, isYjsConnected, collaborationStatus, shopperId]);

  return (
    <main className="flex-1 flex overflow-hidden h-full">
      {/* Filter Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 h-full">
        <FilterSidebar 
          filters={filters} 
          onFiltersChange={setFilters}
          cars={cars}
        />
      </div>

      {/* Car Grid - Scrollable Center */}
      <div className="flex-1 overflow-auto h-full relative">
        {/* Y.js Collaboration Status */}
        {collaborationStatus === 'accepted' && (
          <div className="absolute top-4 right-4 z-10">
            <div className={`px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
              isYjsConnected && isFilterSyncConnected
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-orange-100 text-orange-800 border border-orange-200'
            }`}>
              {isYjsConnected && isFilterSyncConnected 
                ? `🔗 Collaboration Active${impersonateShopperId ? ' (Sales Rep View)' : ''}` 
                : '⏳ Connecting...'}
            </div>
          </div>
        )}
        
        <CarGrid 
          filters={filters} 
          cars={cars}
          loading={loading}
          error={error}
        />
      </div>

      {/* AI Sales Agent Drawer */}
      <div className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out ${
        isAIDrawerOpen ? 'w-96' : 'w-0'
      } flex-shrink-0 h-full relative`}>
        <AISalesAgent 
          isOpen={isAIDrawerOpen}
          onToggle={() => setIsAIDrawerOpen(!isAIDrawerOpen)}
          onFiltersUpdate={setFilters}
          currentFilters={filters}
          cars={cars}
          isImpersonationMode={!!impersonateShopperId}
        />
      </div>

      {/* Collaboration Request Modal - only show when not in impersonation mode */}
      {!impersonateShopperId && (
        <CollaborationRequestModal
          isOpen={!!(callQueueContext.callState.collaborationRequest && callQueueContext.callState.collaborationStatus === 'pending')}
          salesRepName={callQueueContext.callState.collaborationRequest?.salesRepName || ''}
          salesRepId={callQueueContext.callState.collaborationRequest?.salesRepId || ''}
          onAccept={callQueueContext.acceptCollaboration}
          onDecline={callQueueContext.declineCollaboration}
        />
      )}
    </main>
  );
}

export default ShopperPage;
