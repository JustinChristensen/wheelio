import { useEffect } from 'react';
import { useSalesRepWebSocket } from '../../hooks/useSalesRepWebSocket';
import ConnectionStatus from '../ConnectionStatus/ConnectionStatus';
import CallQueueGrid from '../CallQueueGrid/CallQueueGrid';

// For now, we'll use a hardcoded sales rep ID. In a real app, this would come from authentication
const SALES_REP_ID = 'sales-rep-aij0c1sfo';

export function SalesRepPage() {
  
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
          {currentCall && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    Currently Handling Call
                  </h3>
                  <p className="text-sm text-blue-700">
                    Shopper {currentCall.shopperId.slice(-8)} • Connected at {new Date(currentCall.connectedAt).toLocaleTimeString()}
                  </p>
                  {collaborationStatus !== 'none' && (
                    <div className="mt-2 space-y-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        collaborationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        collaborationStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                        collaborationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        Collaboration: {collaborationStatus}
                      </span>
                      {collaborationStatus === 'accepted' && (
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isYjsConnected ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            Y.js: {isYjsConnected ? 'Connected' : 'Connecting...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {collaborationError && (
                    <div className="mt-2 text-sm text-red-600">
                      {collaborationError}
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => requestCollaboration(currentCall.shopperId)}
                    disabled={collaborationStatus === 'pending' || collaborationStatus === 'accepted'}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      collaborationStatus === 'pending' || collaborationStatus === 'accepted'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {collaborationStatus === 'pending' ? 'Requesting...' : 
                     collaborationStatus === 'accepted' ? 'Collaborating' : 
                     'Request Collaboration'}
                  </button>
                  <button
                    onClick={() => releaseCall(currentCall.shopperId)}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                  >
                    Release Call
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
  );
}

export default SalesRepPage;
