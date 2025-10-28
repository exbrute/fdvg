
import React, { useState, useEffect } from 'react';
import ConnectionForm from '../components/ConnectionForm';
import WorldMap from '../components/WorldMap';
import ThemeManager from '../components/ThemeManager';
import NotificationCenter from '../components/NotificationCenter';
import QuickActions from '../components/QuickActions';
import SystemTray from '../components/SystemTray';
import Tooltip from '../components/Tooltip';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../components/NotificationCenter';


function ConnectionPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [link, setLink] = useState('');
  const [themeManagerOpen, setThemeManagerOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [connectionTime, setConnectionTime] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [connectedCountry, setConnectedCountry] = useState(null);
  const [currentView, setCurrentView] = useState('form');
  
  const { currentTheme, accentColor } = useTheme();
  const { addNotification } = useNotifications();


  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        setConnectionTime(prev => prev + 1);
      }, 1000);
    } else {
      setConnectionTime(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Имитация скорости соединения
  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        setUploadSpeed(Math.random() * 50 + 10);
        setDownloadSpeed(Math.random() * 100 + 20);
      }, 2000);
    } else {
      setUploadSpeed(0);
      setDownloadSpeed(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleCountrySelect = (country) => {
    if (isConnected && connectedCountry === country.id) {
    handleDisconnect();
    } else {
      const serverLink = `vpn-${country.id.toLowerCase()}.secure-server.com:51820`;
      setLink(serverLink);
      setConnectedCountry(country.id);
      setIsConnected(true);
      
      addNotification({
        type: 'success',
        title: `Connected to ${country.name}`,
        message: `Server: ${serverLink} • Ping: ${country.ping}ms • Load: ${country.load}%`
      });
    }
  };

  const handleConnect = (inputLink) => {
    setLink(inputLink);
    setIsConnected(true);
    setConnectedCountry('custom');
    
    addNotification({
      type: 'success',
      title: 'Connected Successfully',
      message: `Secure connection to ${inputLink} established`
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setLink('');
    setConnectedCountry(null);
    
    addNotification({
      type: 'info', 
      title: 'Disconnected',
      message: 'VPN connection terminated'
    });
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'speed-test':
        addNotification({
          type: 'info',
          title: 'Speed Test',
          message: 'Starting speed test...'
        });
        setTimeout(() => {
          addNotification({
            type: 'success',
            title: 'Speed Test Complete',
            message: `Download: ${(Math.random() * 200 + 50).toFixed(0)} Mbps, Upload: ${(Math.random() * 100 + 20).toFixed(0)} Mbps`
          });
        }, 2000);
        break;
        
      case 'reconnect':
        if (isConnected) {
          addNotification({
            type: 'warning',
            title: 'Reconnecting',
            message: 'Attempting to reconnect...'
          });
          setIsConnected(false);
          setTimeout(() => {
            setIsConnected(true);
            addNotification({
              type: 'success',
              title: 'Reconnected',
              message: 'Connection reestablished successfully'
            });
          }, 1500);
        }
        break;
        
      case 'kill-switch':
        addNotification({
          type: 'error',
          title: 'Kill Switch Activated',
          message: 'All network connections terminated'
        });
        handleDisconnect();
        break;
        
      case 'copy-config':
        navigator.clipboard.writeText(link || 'No configuration available');
        addNotification({
          type: 'success',
          title: 'Copied',
          message: 'Configuration copied to clipboard'
        });
        break;
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 transition-all duration-500`}>
      
      {/* Welcome overlay */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center animate-pulse">
            <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Secure VPN</h1>
            <p className="text-gray-400">Loading secure environment...</p>
          </div>
        </div>
      )}

      {/* Все UI компоненты */}
      <NotificationCenter />
      <SystemTray 
        isConnected={isConnected} 
        onToggle={isConnected ? handleDisconnect : () => setCurrentView('map')}
      />
      <QuickActions onAction={handleQuickAction} />
      <ThemeManager isOpen={themeManagerOpen} onClose={() => setThemeManagerOpen(false)} />

      {/* Основной контент */}
      <div className="w-full max-w-6xl relative">
        {/* Кнопки управления */}
        <div className="absolute -top-16 right-0 flex space-x-3">
          {/* Кнопка карты */}
          <Tooltip content="Server locations" position="left">
            <button
              onClick={() => setCurrentView(currentView === 'map' ? 'form' : 'map')}
              className={`bg-gray-800 hover:bg-gray-700 rounded-full p-3 transition-all duration-300 hover:scale-110 ${
                currentView === 'map' ? 'bg-accent text-white' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          </Tooltip>

          {/* Кнопка настроек темы */}
          <Tooltip content="Appearance settings" position="left">
            <button
              onClick={() => setThemeManagerOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 rounded-full p-3 transition-all duration-300 hover:scale-110 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M15 5l2 2" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* Заголовок */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
            Secure VPN
          </h1>
          <p className="text-gray-400">Military grade encryption • Global servers</p>
        </div>

        {/* Переключатель между картой и формой */}
        {currentView === 'map' ? (
          <WorldMap 
            onCountrySelect={handleCountrySelect}
            connectedCountry={connectedCountry}
          />
        ) : (
          /* Основная карточка подключения */
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 backdrop-blur-sm bg-opacity-90">
            <div className="p-8">
              {isConnected ? (
                <div className="text-center space-y-6 animate-slide-up">
                  {/* Статус с иконкой */}
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                    <span className="text-accent font-semibold">Secure Connection Active</span>
                  </div>
                  
                  {/* Информация о сервере */}
                  <Tooltip content="Connected server" position="top">
                    <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-accent">
                      <p className="text-gray-300 text-sm">Active Server</p>
                      <p className="text-white font-mono text-sm truncate">{link}</p>
                      {connectedCountry && connectedCountry !== 'custom' && (
                        <p className="text-accent text-xs mt-1">
                          {countries.find(c => c.id === connectedCountry)?.name}
                        </p>
                      )}
                    </div>
                  </Tooltip>

                  {/* Статистика подключения */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Duration</p>
                      <p className="text-white font-mono text-sm">{formatTime(connectionTime)}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Download</p>
                      <p className="text-green-400 font-mono text-sm">{downloadSpeed.toFixed(1)} Mbps</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Upload</p>
                      <p className="text-blue-400 font-mono text-sm">{uploadSpeed.toFixed(1)} Mbps</p>
                    </div>
                  </div>

                  {/* Кнопка отключения */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Disconnect Secure Session</span>
                  </button>
                </div>
              ) : (
                <ConnectionForm onConnect={handleConnect} />
              )}
            </div>
            
            {/* Футер */}
            <div className="bg-gray-900 px-8 py-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-gray-400">
                    {isConnected ? 'Encrypted • Secure' : 'Ready • Waiting'}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-500 text-xs">v2.2.0</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Подсказка переключения */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView(currentView === 'map' ? 'form' : 'map')}
            className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >
            {currentView === 'map' ? '← Back to connection form' : '🌍 View server locations map'}
          </button>
        </div>
      </div>

      {/* Бэкграунд элементы */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-accent rounded-full blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-5 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
    </div>
  );
}

// Список стран для отображения в форме
const countries = [
  { id: 'us', name: 'United States', flag: '🇺🇸', servers: 124, load: 45, ping: 32 },
  { id: 'de', name: 'Germany', flag: '🇩🇪', servers: 89, load: 23, ping: 45 },
  { id: 'jp', name: 'Japan', flag: '🇯🇵', servers: 67, load: 78, ping: 128 },
  { id: 'sg', name: 'Singapore', flag: '🇸🇬', servers: 54, load: 34, ping: 89 },
  { id: 'gb', name: 'United Kingdom', flag: '🇬🇧', servers: 76, load: 56, ping: 38 },
  { id: 'ca', name: 'Canada', flag: '🇨🇦', servers: 43, load: 29, ping: 52 },
  { id: 'fr', name: 'France', flag: '🇫🇷', servers: 61, load: 41, ping: 47 },
  { id: 'nl', name: 'Netherlands', flag: '🇳🇱', servers: 58, load: 38, ping: 42 },
  { id: 'au', name: 'Australia', flag: '🇦🇺', servers: 39, load: 65, ping: 195 },
  { id: 'br', name: 'Brazil', flag: '🇧🇷', servers: 32, load: 72, ping: 156 },
];

export default ConnectionPage;