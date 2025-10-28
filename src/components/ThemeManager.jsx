import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

const themes = {
  dark: {
    name: 'Dark',
    colors: {
      bg: 'from-gray-900 to-gray-800',
      card: 'bg-gray-800',
      text: 'text-white',
      border: 'border-gray-700'
    }
  },
  light: {
    name: 'Light', 
    colors: {
      bg: 'from-blue-50 to-gray-100',
      card: 'bg-white',
      text: 'text-gray-900',
      border: 'border-gray-200'
    }
  },
  oled: {
    name: 'OLED Black',
    colors: {
      bg: 'from-black to-gray-900',
      card: 'bg-gray-900',
      text: 'text-white',
      border: 'border-gray-800'
    }
  },
  gradient: {
    name: 'Gradient',
    colors: {
      bg: 'from-purple-900 via-blue-900 to-gray-900',
      card: 'bg-gradient-to-br from-gray-800 to-gray-900',
      text: 'text-white',
      border: 'border-purple-700'
    }
  }
};

function ThemeManager({ isOpen, onClose }) {
  const { currentTheme, setTheme, accentColor, setAccentColor } = useTheme();

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-gray-800 rounded-2xl p-6 w-96 max-w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Appearance</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Цвет темы */}
          <div>
            <h4 className="text-white font-medium mb-3">Theme</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentTheme === key 
                      ? 'border-accent ring-2 ring-accent ring-opacity-50' 
                      : 'border-gray-600 hover:border-gray-500'
                  } ${theme.colors.card} ${theme.colors.text}`}
                >
                  <div className="text-sm font-medium">{theme.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Акцентный цвет */}
          <div>
            <h4 className="text-white font-medium mb-3">Accent Color</h4>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer bg-gray-700 border border-gray-600"
            />
            <div className="flex gap-2 mt-2">
              {['#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b'].map(color => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className="w-8 h-8 rounded-full border-2 border-gray-600"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Дополнительные настройки */}
          <div>
            <h4 className="text-white font-medium mb-3">Interface</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded bg-gray-700 border-gray-600 text-accent focus:ring-accent" />
                <span className="text-white">Animations</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded bg-gray-700 border-gray-600 text-accent focus:ring-accent" defaultChecked />
                <span className="text-white">Compact mode</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded bg-gray-700 border-gray-600 text-accent focus:ring-accent" />
                <span className="text-white">Glass morphism</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeManager;