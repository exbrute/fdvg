import React, { useState } from 'react';

const SystemTray = ({ isConnected, onToggle, onQuickConnect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`system-tray fixed top-1/2 -translate-y-1/2 left-4 transition-all duration-300 ${
      isExpanded ? 'w-64' : 'w-12'
    }`}>
      <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Заголовок */}
        <div 
          className="p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-white text-sm font-medium truncate">
              {isExpanded ? 'VPN Status' : ''}
            </span>
          </div>
        </div>

        {/* Контент */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Статус */}
            <div className="text-center">
              <div className="text-2xl mb-2">{isConnected ? '🔒' : '🔓'}</div>
              <div className="text-white font-medium">
                {isConnected ? 'Protected' : 'Unprotected'}
              </div>
              <div className="text-gray-400 text-sm">
                {isConnected ? 'Your connection is secure' : 'Connect to protect privacy'}
              </div>
            </div>

            {/* Быстрое действие */}
            <button
              onClick={onToggle}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                isConnected 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-accent hover:bg-accent-dark text-white'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Quick Connect'}
            </button>

            {/* Мини-статистика */}
            {isConnected && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Duration:</span>
                  <span className="text-white">2h 15m</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Data:</span>
                  <span className="text-white">1.2 GB</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemTray;