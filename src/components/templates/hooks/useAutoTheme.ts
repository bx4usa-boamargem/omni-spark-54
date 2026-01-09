import { useState, useEffect, useMemo } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface UseAutoThemeOptions {
  themeMode: ThemeMode;
  darkPrimaryColor?: string | null;
  darkSecondaryColor?: string | null;
}

interface UseAutoThemeResult {
  activeTheme: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  isDark: boolean;
}

const getThemeByTime = (): 'light' | 'dark' => {
  const hour = new Date().getHours();
  // Light mode: 6 AM - 6 PM
  // Dark mode: 6 PM - 6 AM
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
};

const lightenColor = (hex: string, percent: number): string => {
  // Remove # if present
  const color = hex.replace('#', '');
  
  const num = parseInt(color, 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * percent));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * percent));
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const useAutoTheme = (
  options: UseAutoThemeOptions,
  lightPrimaryColor: string = '#6366f1',
  lightSecondaryColor: string = '#8b5cf6'
): UseAutoThemeResult => {
  const { themeMode, darkPrimaryColor, darkSecondaryColor } = options;
  
  const [timeBasedTheme, setTimeBasedTheme] = useState<'light' | 'dark'>(getThemeByTime());
  
  useEffect(() => {
    if (themeMode !== 'auto') return;
    
    // Update theme based on time
    const checkTheme = () => {
      setTimeBasedTheme(getThemeByTime());
    };
    
    // Check every minute
    const interval = setInterval(checkTheme, 60000);
    
    return () => clearInterval(interval);
  }, [themeMode]);
  
  const activeTheme = useMemo(() => {
    if (themeMode === 'auto') {
      return timeBasedTheme;
    }
    return themeMode;
  }, [themeMode, timeBasedTheme]);
  
  const { primaryColor, secondaryColor } = useMemo(() => {
    if (activeTheme === 'dark') {
      return {
        primaryColor: darkPrimaryColor || lightenColor(lightPrimaryColor, 0.3),
        secondaryColor: darkSecondaryColor || lightenColor(lightSecondaryColor, 0.3),
      };
    }
    return {
      primaryColor: lightPrimaryColor,
      secondaryColor: lightSecondaryColor,
    };
  }, [activeTheme, darkPrimaryColor, darkSecondaryColor, lightPrimaryColor, lightSecondaryColor]);
  
  return {
    activeTheme,
    primaryColor,
    secondaryColor,
    isDark: activeTheme === 'dark',
  };
};
