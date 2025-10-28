// WorldMap.jsx - С ПЛАВНЫМИ ПЕРЕХОДАМИ
import React, { useState, useEffect, useRef } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WorldMap = ({ onCountrySelect, connectedCountry }) => {
  const [position, setPosition] = useState({ 
    coordinates: [0, 0], 
    zoom: 1 
  });
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);

  // Серверы с реальными координатами
  const serverLocations = [
    { 
      id: 'us', 
      name: 'United States', 
      coordinates: [-98.5795, 39.8283], 
      flag: '🇺🇸', 
      servers: 124, 
      load: 45, 
      ping: 32 
    },
    { 
      id: 'de', 
      name: 'Germany', 
      coordinates: [10.4515, 51.1657], 
      flag: '🇩🇪', 
      servers: 89, 
      load: 23, 
      ping: 45 
    },
    { 
      id: 'jp', 
      name: 'Japan', 
      coordinates: [138.2529, 36.2048], 
      flag: '🇯🇵', 
      servers: 67, 
      load: 78, 
      ping: 128 
    },
    { 
      id: 'sg', 
      name: 'Singapore', 
      coordinates: [103.8198, 1.3521], 
      flag: '🇸🇬', 
      servers: 54, 
      load: 34, 
      ping: 89 
    },
    { 
      id: 'gb', 
      name: 'United Kingdom', 
      coordinates: [-3.4360, 55.3781], 
      flag: '🇬🇧', 
      servers: 76, 
      load: 56, 
      ping: 38 
    },
    { 
      id: 'ca', 
      name: 'Canada', 
      coordinates: [-106.3468, 56.1304], 
      flag: '🇨🇦', 
      servers: 43, 
      load: 29, 
      ping: 52 
    },
    { 
      id: 'fr', 
      name: 'France', 
      coordinates: [2.2137, 46.2276], 
      flag: '🇫🇷', 
      servers: 61, 
      load: 41, 
      ping: 47 
    },
    { 
      id: 'nl', 
      name: 'Netherlands', 
      coordinates: [5.2913, 52.1326], 
      flag: '🇳🇱', 
      servers: 58, 
      load: 38, 
      ping: 42 
    },
    { 
      id: 'au', 
      name: 'Australia', 
      coordinates: [133.7751, -25.2744], 
      flag: '🇦🇺', 
      servers: 39, 
      load: 65, 
      ping: 195 
    },
    { 
      id: 'br', 
      name: 'Brazil', 
      coordinates: [-53.2, -10.3333], 
      flag: '🇧🇷', 
      servers: 32, 
      load: 72, 
      ping: 156 
    },
    { 
      id: 'kr', 
      name: 'South Korea', 
      coordinates: [127.7669, 35.9078], 
      flag: '🇰🇷', 
      servers: 45, 
      load: 38, 
      ping: 95 
    },
    { 
      id: 'in', 
      name: 'India', 
      coordinates: [78.9629, 20.5937], 
      flag: '🇮🇳', 
      servers: 38, 
      load: 68, 
      ping: 142 
    },
    { 
      id: 'za', 
      name: 'South Africa', 
      coordinates: [22.9375, -30.5595], 
      flag: '🇿🇦', 
      servers: 29, 
      load: 52, 
      ping: 178 
    },
    { 
      id: 'eg', 
      name: 'Egypt', 
      coordinates: [30.8025, 26.8206], 
      flag: '🇪🇬', 
      servers: 26, 
      load: 48, 
      ping: 112 
    },
    { 
      id: 'ru', 
      name: 'Russia', 
      coordinates: [105.3188, 61.5240], 
      flag: '🇷🇺', 
      servers: 72, 
      load: 62, 
      ping: 86 
    }
  ];

  // Плавная анимация к целевой позиции
  const animateToPosition = (targetCoordinates, targetZoom = 3, duration = 1500) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsAnimating(true);
    
    const startTime = performance.now();
    const startCoordinates = position.coordinates;
    const startZoom = position.zoom;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easing function для плавности
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const newCoordinates = [
        startCoordinates[0] + (targetCoordinates[0] - startCoordinates[0]) * easeOutQuart,
        startCoordinates[1] + (targetCoordinates[1] - startCoordinates[1]) * easeOutQuart
      ];
      
      const newZoom = startZoom + (targetZoom - startZoom) * easeOutQuart;
      
      setPosition({
        coordinates: newCoordinates,
        zoom: newZoom
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleCountryClick = (country) => {
    setSelectedCountry(country);
    
    // Плавный переход к выбранной стране
    animateToPosition(country.coordinates, 3);
    
    // Небольшая задержка перед подключением для лучшего UX
    setTimeout(() => {
      onCountrySelect(country);
    }, 800);
  };

  // Центрировать карту при первом рендере
  useEffect(() => {
    animateToPosition([0, 20], 1, 2000);
  }, []);

  // Очистка анимации при размонтировании
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleMoveEnd = (position) => {
    if (!isAnimating) {
      setPosition(position);
    }
  };

  const getLoadColor = (load) => {
    if (load < 40) return '#10B981'; // green
    if (load < 70) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getPingColor = (ping) => {
    if (ping < 50) return '#10B981'; // green
    if (ping < 100) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  // Кнопка возврата к общему виду
  const resetView = () => {
    animateToPosition([0, 20], 1);
    setSelectedCountry(null);
  };

  return (
    <div className="world-map-container bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-semibold text-lg">Global Server Locations</h3>
        
        <div className="flex items-center space-x-4">
          {/* Кнопка сброса вида */}
          <button
            onClick={resetView}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2"
            disabled={isAnimating}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset View</span>
          </button>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Optimal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>High Load</span>
            </div>
          </div>
        </div>
      </div>

      {/* Реальная карта мира */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-600 mb-6 relative">
        {/* Индикатор анимации */}
        {isAnimating && (
          <div className="absolute top-4 right-4 z-10 bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>Navigating...</span>
          </div>
        )}
        
        <div className="absolute top-4 left-4 z-10 bg-gray-800 rounded-lg p-2 text-xs text-gray-400">
          🖱️ Drag to move • 🔍 Scroll to zoom
        </div>
        
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [0, 20]
          }}
          className="w-full h-96 rounded-lg transition-opacity duration-300"
          style={{
            opacity: isAnimating ? 0.9 : 1,
            cursor: isAnimating ? 'wait' : 'grab'
          }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const isHovered = hoveredCountry === geo.properties.name;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isHovered ? "#4B5563" : "#374151"}
                      stroke="#4B5563"
                      strokeWidth={0.5}
                      style={{
                        default: { 
                          outline: "none",
                          transition: "fill 0.3s ease"
                        },
                        hover: { 
                          fill: "#4B5563", 
                          outline: "none",
                          transition: "all 0.2s"
                        },
                        pressed: { fill: "#6B7280", outline: "none" },
                      }}
                      onMouseEnter={() => setHoveredCountry(geo.properties.name)}
                      onMouseLeave={() => setHoveredCountry(null)}
                    />
                  );
                })
              }
            </Geographies>

            {/* Маркеры серверов */}
            {serverLocations.map((server) => {
              const isConnected = connectedCountry === server.id;
              const isSelected = selectedCountry?.id === server.id;
              
              return (
                <Marker key={server.id} coordinates={server.coordinates}>
                  {/* Анимированное кольцо для подключенного сервера */}
                  {isConnected && (
                    <circle
                      r={12}
                      fill="none"
                      stroke="var(--accent-color)"
                      strokeWidth={2}
                      strokeOpacity={0.6}
                      className="animate-ping"
                    />
                  )}
                  
                  {/* Пульсирующий эффект для выбранного сервера */}
                  {isSelected && !isConnected && (
                    <circle
                      r={10}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={1}
                      strokeOpacity={0.4}
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Основной маркер */}
                  <circle
                    r={isSelected ? 8 : 6}
                    fill={isConnected ? "var(--accent-color)" : getLoadColor(server.load)}
                    stroke={isConnected ? "var(--accent-color)" : "#ffffff"}
                    strokeWidth={isConnected ? 3 : 2}
                    strokeOpacity={0.8}
                    className={`cursor-pointer transition-all duration-300 ${
                      isAnimating ? '' : 'hover:scale-150'
                    } ${isSelected ? 'scale-125' : ''}`}
                    onClick={() => !isAnimating && handleCountryClick(server)}
                    onMouseEnter={() => !isAnimating && setHoveredCountry(server.name)}
                    onMouseLeave={() => !isAnimating && setHoveredCountry(null)}
                  />
                  
                  {/* Текст с пингом при наведении */}
                  {hoveredCountry === server.name && !isAnimating && (
                    <text
                      textAnchor="middle"
                      y={-15}
                      style={{
                        fontFamily: "system-ui",
                        fill: "#ffffff",
                        fontSize: "10px",
                        fontWeight: "bold",
                        pointerEvents: "none",
                        transition: "all 0.3s ease"
                      }}
                    >
                      {server.ping}ms
                    </text>
                  )}
                </Marker>
              );
            })}

            {/* Линия соединения при выбранной стране */}
            {selectedCountry && position.coordinates[0] !== 0 && (
              <line
                x1={position.coordinates[0]}
                y1={position.coordinates[1]}
                x2={selectedCountry.coordinates[0]}
                y2={selectedCountry.coordinates[1]}
                stroke="var(--accent-color)"
                strokeWidth={1}
                strokeOpacity={0.5}
                strokeDasharray="5,5"
                className="animate-pulse"
              />
            )}
          </ZoomableGroup>
        </ComposableMap>

        {/* Легенда карты */}
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg p-3 text-xs">
          <div className="text-gray-400 mb-2">Click on dots to connect</div>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>&lt;40% load</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>40-70% load</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>&gt;70% load</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Список серверов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
        {serverLocations.map((server) => {
          const isConnected = connectedCountry === server.id;
          const isSelected = selectedCountry?.id === server.id;
          
          return (
            <div
              key={server.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'bg-accent bg-opacity-20 border-accent transform scale-105'
                  : isConnected
                  ? 'bg-green-500 bg-opacity-10 border-green-500'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:transform hover:scale-105'
              } ${isAnimating ? 'opacity-50' : ''}`}
              onClick={() => !isAnimating && handleCountryClick(server)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{server.flag}</span>
                  <div>
                    <div className="text-white font-medium text-sm">{server.name}</div>
                    <div className="text-gray-400 text-xs">{server.servers} servers</div>
                  </div>
                </div>
                <div className="text-right">
                  <div 
                    className="text-xs font-medium"
                    style={{ color: getPingColor(server.ping) }}
                  >
                    {server.ping}ms
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: getLoadColor(server.load) }}
                  >
                    {server.load}% load
                  </div>
                </div>
              </div>
              
              {/* Индикатор статуса */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isConnected ? 'bg-accent animate-pulse' : 
                      isSelected ? 'bg-white' : 'bg-gray-500'
                    }`}
                  ></div>
                  <span className="text-gray-400 text-xs">
                    {isConnected ? 'Connected' : 
                     isSelected ? 'Selected' : 'Available'}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    !isAnimating && handleCountryClick(server);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-300 ${
                    isConnected
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-accent hover:bg-accent-dark text-white'
                  } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isAnimating}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Панель выбранного сервера */}
      {selectedCountry && (
        <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{selectedCountry.flag}</span>
              <div>
                <div className="text-white font-semibold">{selectedCountry.name}</div>
                <div className="text-gray-400 text-sm">
                  {selectedCountry.servers} servers • {selectedCountry.ping}ms ping • {selectedCountry.load}% load
                </div>
                <div className="text-accent text-xs mt-1">
                  Server: vpn-{selectedCountry.id}.secure-server.com:51820
                </div>
              </div>
            </div>
            <button
              onClick={() => onCountrySelect(selectedCountry)}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                connectedCountry === selectedCountry.id
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-accent hover:bg-accent-dark text-white'
              }`}
            >
              {connectedCountry === selectedCountry.id ? 'Disconnect' : 'Connect Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;