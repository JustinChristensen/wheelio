import React from 'react';
import { CallQueueState } from '../../hooks/useCallQueue';

interface CallStatusProps {
  callState: CallQueueState;
  onDisconnect: () => void;
}

const CallStatus: React.FC<CallStatusProps> = ({ callState, onDisconnect }) => {
  const getStatusDisplay = () => {
    switch (callState.status) {
      case 'connecting':
        return {
          icon: (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          ),
          title: 'Connecting...',
          message: 'Connecting to call service',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
        
      case 'in-queue':
        return {
          icon: (
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Waiting for an agent',
          message: callState.position ? 
            `You're #${callState.position} in line` : 
            'You\'re in the queue',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800'
        };
        
      case 'connected-to-rep':
        return {
          icon: (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          title: 'You\'re talking to',
          message: callState.assignedSalesRepId ? 
            `Sales Rep ${callState.assignedSalesRepId.slice(-6).toUpperCase()}` : 
            'A sales representative',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
        
      case 'error':
        return {
          icon: (
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Connection error',
          message: callState.error || 'Unable to connect to call service',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800'
        };
        
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  if (!statusDisplay) return null;

  return (
    <div className={`p-3 mb-4 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {statusDisplay.icon}
          <div>
            <p className={`text-sm font-medium ${statusDisplay.textColor}`}>
              {statusDisplay.title}
            </p>
            <p className={`text-xs ${statusDisplay.textColor} opacity-80`}>
              {statusDisplay.message}
            </p>
          </div>
        </div>
        
        <button
          onClick={onDisconnect}
          className={`text-xs px-2 py-1 rounded ${statusDisplay.textColor} hover:bg-opacity-20 hover:bg-gray-500 transition-colors`}
          title="Disconnect from call"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Queue position animation for in-queue status */}
      {callState.status === 'in-queue' && (
        <div className="mt-2">
          <div className="flex items-center space-x-1">
            <div className="flex-1 bg-yellow-200 rounded-full h-1.5">
              <div 
                className="bg-yellow-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: callState.position ? `${Math.max(10, 100 - (callState.position * 20))}%` : '10%' 
                }}
              ></div>
            </div>
            <span className="text-xs text-yellow-600 font-medium">
              {callState.position ? `#${callState.position}` : '...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallStatus;
