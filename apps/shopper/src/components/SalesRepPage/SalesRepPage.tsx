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
    isBusy
  } = useSalesRepWebSocket(SALES_REP_ID);

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
                </div>
                <button
                  onClick={() => releaseCall(currentCall.shopperId)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  Release Call
                </button>
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
