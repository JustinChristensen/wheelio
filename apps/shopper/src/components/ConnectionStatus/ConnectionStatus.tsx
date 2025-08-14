interface ConnectionStatusProps {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string | null;
  salesRepId: string;
}

export function ConnectionStatus({ isConnected, connectionStatus, error, salesRepId }: ConnectionStatusProps) {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        );
      case 'connecting':
        return (
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        );
      case 'disconnected':
        return (
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
        );
      case 'error':
        return (
          <div className="w-2 h-2 bg-red-400 rounded-full" />
        );
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to call queue';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return error || 'Connection error';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Sales Rep: {salesRepId}
            </h3>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {connectionStatus === 'connected' && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Real-time updates active</span>
          </div>
        )}
      </div>
      
      {error && connectionStatus === 'error' && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
