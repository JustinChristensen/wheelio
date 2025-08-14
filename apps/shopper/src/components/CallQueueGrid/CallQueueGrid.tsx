import { CallQueueSummary } from '../../hooks/useSalesRepWebSocket';

interface CallQueueTileProps {
  call: CallQueueSummary;
  onClick: (shopperId: string) => void;
}

function CallQueueTile({ call, onClick }: CallQueueTileProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
        call.isConnected
          ? call.assignedSalesRepId
            ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
            : 'bg-green-50 border-green-200 hover:bg-green-100'
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}
      onClick={() => onClick(call.shopperId)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">
          Shopper {call.shopperId.slice(-8)}
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              call.isConnected ? 'bg-green-400' : 'bg-gray-400'
            }`}
          />
          <span className="text-xs font-medium text-gray-600">
            {call.isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Connected:</span>
          <span className="font-mono">{formatDate(call.connectedAt)}</span>
        </div>
        
        {call.isConnected ? (
          <div className="flex justify-between">
            <span>Wait time:</span>
            <span className="font-mono font-medium text-blue-600">
              {formatTime(call.ageInSeconds)}
            </span>
          </div>
        ) : (
          call.timeSinceDisconnectedSeconds && (
            <div className="flex justify-between">
              <span>Disconnected:</span>
              <span className="font-mono text-gray-500">
                {formatTime(call.timeSinceDisconnectedSeconds)} ago
              </span>
            </div>
          )
        )}

        {call.assignedSalesRepId && (
          <div className="flex justify-between">
            <span>Assigned to:</span>
            <span className="font-medium text-yellow-600">
              Rep {call.assignedSalesRepId.slice(-6)}
            </span>
          </div>
        )}
      </div>

      {call.isConnected && !call.assignedSalesRepId && (
        <div className="mt-3 px-2 py-1 bg-green-100 border border-green-200 rounded text-xs font-medium text-green-700 text-center">
          Available to claim
        </div>
      )}
    </div>
  );
}

interface CallQueueGridProps {
  queue: CallQueueSummary[];
  onCallClick: (shopperId: string) => void;
}

export function CallQueueGrid({ queue, onCallClick }: CallQueueGridProps) {
  // Sort queue: connected and unassigned first, then by connection time
  const sortedQueue = [...queue].sort((a, b) => {
    // Priority 1: Connected and available calls
    if (a.isConnected && !a.assignedSalesRepId && (!b.isConnected || b.assignedSalesRepId)) {
      return -1;
    }
    if (b.isConnected && !b.assignedSalesRepId && (!a.isConnected || a.assignedSalesRepId)) {
      return 1;
    }
    
    // Priority 2: Connected but assigned calls
    if (a.isConnected && !b.isConnected) return -1;
    if (b.isConnected && !a.isConnected) return 1;
    
    // Priority 3: Sort by connection time (oldest first)
    return a.connectedAt - b.connectedAt;
  });

  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No calls in queue</h3>
          <p className="text-gray-600">Shoppers will appear here when they request assistance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedQueue.map((call) => (
        <CallQueueTile
          key={call.shopperId}
          call={call}
          onClick={onCallClick}
        />
      ))}
    </div>
  );
}

export default CallQueueGrid;
