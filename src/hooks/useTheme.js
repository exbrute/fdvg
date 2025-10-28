import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [accentColor, setAccentColor] = useState('#10b981');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  useEffect(() => {
    const savedColor = localStorage.getItem('vpn-accent-color');
    const savedTheme = localStorage.getItem('vpn-theme');
    const savedAnimations = localStorage.getItem('vpn-animations');
    
    if (savedColor) setAccentColor(savedColor);
    if (savedTheme) setCurrentTheme(savedTheme);
    if (savedAnimations) setAnimationsEnabled(JSON.parse(savedAnimations));
  }, []);

  useEffect(() => {
    localStorage.setItem('vpn-accent-color', accentColor);
    localStorage.setItem('vpn-theme', currentTheme);
    localStorage.setItem('vpn-animations', JSON.stringify(animationsEnabled));
    
    // Применяем настройки
    document.documentElement.style.setProperty('--accent-color', accentColor);
    
    if (!animationsEnabled) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    } else {
      document.documentElement.style.setProperty('--animation-duration', '0.3s');
    }
  }, [accentColor, currentTheme, animationsEnabled]);

  return {
    accentColor,
    setAccentColor,
    currentTheme,
    setTheme: setCurrentTheme,
    animationsEnabled,
    setAnimationsEnabled
  };
};