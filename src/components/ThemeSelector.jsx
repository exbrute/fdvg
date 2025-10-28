import React from 'react';

const colorPresets = [
  { name: 'Emerald', value: '#10b981', class: 'bg-emerald-500' },
  { name: 'Purple', value: '#8b5cf6', class: 'bg-purple-500' },
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Lime', value: '#84cc16', class: 'bg-lime-500' }
];

function ThemeSelector({ currentColor, onColorChange, isOpen, onToggle }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 text-dark-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-700"
        title="Change theme"
      >
        <div 
          className="w-6 h-6 rounded-full border-2 border-dark-400"
          style={{ backgroundColor: currentColor }}
        ></div>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 bg-dark-800 border border-dark-600 rounded-lg shadow-2xl p-4 w-64 z-50">
          <h3 className="text-white font-medium mb-3">Theme Color</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {colorPresets.map((color) => (
              <button
                key={color.value}
                onClick={() => onColorChange(color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  currentColor === color.value ? 'border-white' : 'border-dark-400'
                } ${color.class}`}
                title={color.name}
              />
            ))}
          </div>
          
          <div className="mb-3">
            <label className="text-dark-300 text-sm block mb-2">Custom Color</label>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full h-10 rounded-lg cursor-pointer bg-dark-700 border border-dark-600"
            />
          </div>
          
          <div className="text-xs text-dark-400">
            Hex: {currentColor}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeSelector;