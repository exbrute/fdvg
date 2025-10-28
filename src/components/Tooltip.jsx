import React, { useState } from 'react';

const Tooltip = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 shadow-2xl border border-gray-700 whitespace-nowrap">
            {content}
            <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'top-full -translate-x-1/2 left-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full -translate-x-1/2 left-1/2 -mb-1' :
              position === 'left' ? 'left-full -translate-y-1/2 top-1/2 -mr-1' :
              'right-full -translate-y-1/2 top-1/2 -ml-1'
            }`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;