import { useEffect, useState } from 'react';
import { CarFilters } from 'car-data';
import { useSalesRepWebSocket } from '../../hooks/useSalesRepWebSocket';
import { useYjsFilterSync } from '../../hooks/useYjsFilterSync';
import ConnectionStatus from '../ConnectionStatus/ConnectionStatus';
import CallQueueGrid from '../CallQueueGrid/CallQueueGrid';
import ShopperPage from '../ShopperPage/ShopperPage';
import SalesRepDrawer from '../SalesRepDrawer/SalesRepDrawer';

// Generate a random sales rep ID in the format 'sales-rep-xxxxxxxxx' on every reload
function generateSalesRepId() {
  const randomStr = Math.random().toString(36).substring(2, 11);
  return `sales-rep-${randomStr}`;
}
const SALES_REP_ID = generateSalesRepId();

export function SalesRepPage() {
  // Filter state for sales rep (will be synced with shopper)
  const [filters, setFilters] = useState<CarFilters>({});
  
  const {
    queue,
    isConnected,
    connectionStatus,
    error,
    claimCall,
    releaseCall,
    currentCall,
    isBusy,
    requestCollaboration,
    collaborationStatus,
    collaborationError,
    // Y.js collaboration
    yjsDoc,
    isYjsConnected
  } = useSalesRepWebSocket(SALES_REP_ID);

  // Y.js filter synchronization for real-time collaboration
  const { isConnected: isFilterSyncConnected } = useYjsFilterSync({
    shopperId: currentCall?.shopperId || '',
    enabled: collaborationStatus === 'accepted' && !!currentCall,
    filters,
    onFiltersChange: (newFilters) => {
      console.log('[Sales Rep] Received filter update from shopper:', newFilters);
      setFilters(newFilters);
    },
    role: 'salesRep',
  });

  // Reset filters when collaboration ends or call changes
  useEffect(() => {
    if (collaborationStatus !== 'accepted' || !currentCall) {
      console.log('[Sales Rep] Collaboration ended, clearing filters');
      setFilters({});
    }
  }, [collaborationStatus, currentCall]);

  // Test Y.js functionality when connected
  useEffect(() => {
    if (yjsDoc && isYjsConnected) {
      const testMap = yjsDoc.getMap('test');
      
      // Add observer for changes
      const observer = (event: { changes: { keys: Map<string, { action: string }> } }) => {
        console.log('Sales Rep - Y.js test map changed:', event.changes.keys);
        event.changes.keys.forEach((change: { action: string }, key: string) => {
          if (change.action === 'add' || change.action === 'update') {
            console.log(`Sales Rep - Key "${key}" ${change.action}ed with value:`, testMap.get(key));
          }
        });
      };
      
      testMap.observe(observer);
      
      // Set sales rep test data
      const timestamp = Date.now();
      testMap.set('lastUpdate', timestamp);
      testMap.set('updatedBy', 'salesRep');
      
      console.log('Sales Rep - Y.js document connected for shopper:', currentCall?.shopperId);
      
      return () => {
        testMap.unobserve(observer);
      };
    }
  }, [yjsDoc, isYjsConnected, currentCall?.shopperId]);

  const handleAnswerCall = (shopperId: string) => {
    if (isBusy) {
      return; // Don't allow claiming calls when busy
    }
    
    const call = queue.find(c => c.shopperId === shopperId);
    if (call && call.isConnected && !call.assignedSalesRepId) {
      claimCall(shopperId);
    }
  };

  return (
    <>
      {/* When handling a call, show ShopperPage with overlay drawer */}
      {currentCall ? (
        <>
          <ShopperPage
            impersonateShopperId={currentCall.shopperId}
            isCollaborationActive={collaborationStatus === 'accepted'}
            yjsDoc={yjsDoc || undefined}
            isYjsConnected={isYjsConnected}
          />
          <SalesRepDrawer
            salesRepId={SALES_REP_ID}
            queue={queue}
            isConnected={isConnected}
            connectionStatus={connectionStatus}
            error={error}
            currentCall={currentCall}
            isBusy={isBusy}
            collaborationStatus={collaborationStatus}
            collaborationError={collaborationError}
            isYjsConnected={isYjsConnected}
            isFilterSyncConnected={isFilterSyncConnected}
            onAnswerCall={handleAnswerCall}
            onRequestCollaboration={requestCollaboration}
            onReleaseCall={releaseCall}
          />
        </>
      ) : (
        /* When no call is active, show normal dashboard */
        <main className="flex-1 overflow-auto h-full bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Sales Representative Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Monitor and manage incoming customer calls
              </p>
            </div>

            <ConnectionStatus
              isConnected={isConnected}
              connectionStatus={connectionStatus}
              error={error}
              salesRepId={SALES_REP_ID}
            />

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Call Queue
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span>Available ({queue.filter(c => c.isConnected && !c.assignedSalesRepId).length})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    <span>Assigned ({queue.filter(c => c.assignedSalesRepId).length})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span>Offline ({queue.filter(c => !c.isConnected).length})</span>
                  </div>
                </div>
              </div>

              <CallQueueGrid
                queue={queue}
                isBusy={isBusy}
                onAnswerCall={handleAnswerCall}
              />
            </div>
          </div>
        </main>
      )}
    </>
  );
}

export default SalesRepPage;
