import { useState } from 'react';
import ConnectionStatus from '../ConnectionStatus/ConnectionStatus';
import CallQueueGrid from '../CallQueueGrid/CallQueueGrid';

interface CallQueueSummary {
  shopperId: string;
  connectedAt: number;
  disconnectedAt?: number;
  isConnected: boolean;
  timeSinceDisconnectedSeconds?: number;
  assignedSalesRepId?: string;
  hasMicrophone: boolean;
}

interface SalesRepDrawerProps {
  salesRepId: string;
  queue: CallQueueSummary[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  currentCall: CallQueueSummary | null;
  isBusy: boolean;
  collaborationStatus: string;
  collaborationError: string | null;
  isYjsConnected: boolean;
  isFilterSyncConnected: boolean;
  onAnswerCall: (shopperId: string) => void;
  onRequestCollaboration: (shopperId: string) => void;
  onReleaseCall: (shopperId: string) => void;
}

export function SalesRepDrawer({
  salesRepId,
  queue,
  isConnected,
  connectionStatus,
  error,
  currentCall,
  isBusy,
  collaborationStatus,
  collaborationError,
  isYjsConnected,
  isFilterSyncConnected,
  onAnswerCall,
  onRequestCollaboration,
  onReleaseCall,
}: SalesRepDrawerProps) {
  // Default to expanded if there's an active call so release button is visible
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleDrawer = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      {/* Drawer Header - Always Visible */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Sales Rep Dashboard
            </h3>
            {currentCall && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">
                  Handling call from Shopper {currentCall.shopperId.slice(-8)}
                </span>
              </div>
            )}
            {collaborationStatus === 'accepted' && (
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isYjsConnected ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  Y.js: {isYjsConnected ? 'Connected' : 'Connecting...'}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isFilterSyncConnected ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  Filters: {isFilterSyncConnected ? 'Synced' : 'Syncing...'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {currentCall && (
              <>
                <button
                  onClick={() => onRequestCollaboration(currentCall.shopperId)}
                  disabled={collaborationStatus === 'pending' || collaborationStatus === 'accepted'}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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
                  onClick={() => onReleaseCall(currentCall.shopperId)}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  Release Call
                </button>
              </>
            )}
            <button
              onClick={toggleDrawer}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label={isExpanded ? 'Collapse drawer' : 'Expand drawer'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Content - Collapsible */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-96' : 'max-h-0'
      }`}>
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          <ConnectionStatus
            isConnected={isConnected}
            connectionStatus={connectionStatus}
            error={error}
            salesRepId={salesRepId}
          />

          {currentCall && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-semibold text-blue-900">
                    Currently Handling Call
                  </h4>
                  <p className="text-sm text-blue-700">
                    Shopper {currentCall.shopperId.slice(-8)} • Connected at {new Date(currentCall.connectedAt).toLocaleTimeString()}
                  </p>
                </div>
                
                {collaborationStatus !== 'none' && (
                  <div className="space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      collaborationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      collaborationStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                      collaborationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Collaboration: {collaborationStatus}
                    </span>
                  </div>
                )}
                
                {collaborationError && (
                  <div className="text-sm text-red-600">
                    {collaborationError}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Call Queue
              </h4>
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
              onAnswerCall={onAnswerCall}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesRepDrawer;
