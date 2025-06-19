import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { themes, Theme, ThemeType } from '../themes/themes';
import { getActiveCustomTheme } from '../utils/customThemeUtils';
import { useSimpleDeviceConfig } from './SimpleDeviceConfig';

interface EnhancedThemeContextType {
  theme: Theme;
  themeType: ThemeType | 'custom';
  isCustomTheme: boolean;
  customThemeId?: string;
  refreshTheme: () => Promise<void>;
}

const EnhancedThemeContext = createContext<EnhancedThemeContextType | undefined>(undefined);

interface EnhancedThemeProviderProps {
  children: ReactNode;
  themeType: ThemeType;
}

export const EnhancedThemeProvider: React.FC<EnhancedThemeProviderProps> = ({ 
  children, 
  themeType: fallbackThemeType 
}) => {
  const { config } = useSimpleDeviceConfig();
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[fallbackThemeType]);
  const [activeThemeType, setActiveThemeType] = useState<ThemeType | 'custom'>(fallbackThemeType);
  const [isCustomTheme, setIsCustomTheme] = useState(false);
  const [customThemeId, setCustomThemeId] = useState<string | undefined>();

  const refreshTheme = async () => {
    try {
      // Pass config to getActiveCustomTheme to check database
      const customThemeActivation = await getActiveCustomTheme(config);
      
      if (customThemeActivation.isActive && customThemeActivation.theme) {
        // Use custom theme (either from database or local storage)
        console.log('🎨 Enhanced Theme: Full theme data:', customThemeActivation.theme);
        console.log('🎨 Enhanced Theme: Theme images:', customThemeActivation.theme.images);
        setCurrentTheme(customThemeActivation.theme);
        setActiveThemeType('custom');
        setIsCustomTheme(true);
        setCustomThemeId(customThemeActivation.originalThemeId);
        console.log('🎨 Enhanced Theme: Loaded custom theme:', customThemeActivation.originalThemeId);
      } else {
        // Use built-in theme
        setCurrentTheme(themes[fallbackThemeType]);
        setActiveThemeType(fallbackThemeType);
        setIsCustomTheme(false);
        setCustomThemeId(undefined);
        console.log('🎨 Enhanced Theme: Loaded built-in theme:', fallbackThemeType);
      }
    } catch (error) {
      console.error('🎨 Enhanced Theme: Error loading theme:', error);
      // Fallback to built-in theme
      setCurrentTheme(themes[fallbackThemeType]);
      setActiveThemeType(fallbackThemeType);
      setIsCustomTheme(false);
      setCustomThemeId(undefined);
    }
  };

  useEffect(() => {
    refreshTheme();
  }, [fallbackThemeType, config]); // Refresh when config changes

  const contextValue: EnhancedThemeContextType = {
    theme: currentTheme,
    themeType: activeThemeType,
    isCustomTheme,
    customThemeId,
    refreshTheme,
  };

  return (
    <EnhancedThemeContext.Provider value={contextValue}>
      {children}
    </EnhancedThemeContext.Provider>
  );
};

export const useEnhancedTheme = () => {
  const context = useContext(EnhancedThemeContext);
  if (context === undefined) {
    throw new Error('useEnhancedTheme must be used within an EnhancedThemeProvider');
  }
  return context;
};

// Backward compatibility hook
export const useTheme = () => {
  const context = useContext(EnhancedThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within an EnhancedThemeProvider');
  }
  return {
    theme: context.theme,
    themeType: context.themeType,
  };
};