import React, { createContext, useContext, ReactNode } from 'react';
import { themes, Theme, ThemeType } from '../themes/themes';

interface ThemeContextType {
  theme: Theme;
  themeType: ThemeType;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  themeType: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, themeType }) => {
  const theme = themes[themeType];

  const contextValue: ThemeContextType = {
    theme,
    themeType,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};