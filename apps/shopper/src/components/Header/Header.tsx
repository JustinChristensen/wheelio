import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Wheelio
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Future: User account, notifications, etc. */}
          <span className="text-sm text-gray-500">
            AI-Powered Car Shopping
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
