import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomTheme } from '../types/theme';
import { Theme } from '../themes/themes';

export const CUSTOM_THEME_KEY = 'activeCustomTheme';

export interface CustomThemeActivation {
  isActive: boolean;
  theme?: Theme;
  originalThemeId?: string;
}

// Convert CustomTheme to the app's Theme format
export const convertCustomThemeToAppTheme = (customTheme: CustomTheme): Theme => {
  return {
    name: customTheme.name,
    colors: {
      primary: customTheme.colors.primary,
      primaryDark: customTheme.colors.primary, // Use primary as fallback
      primaryLight: customTheme.colors.secondary,
      secondary: customTheme.colors.secondary,
      background: customTheme.colors.background,
      surface: customTheme.colors.surface,
      cardBackground: customTheme.colors.surface,
      headerBackground: customTheme.colors.headerBackground,
      text: customTheme.colors.text,
      textSecondary: customTheme.colors.textSecondary,
      textLight: customTheme.colors.textSecondary,
      success: customTheme.colors.success,
      warning: customTheme.colors.warning,
      error: customTheme.colors.error,
      info: customTheme.colors.info,
    },
    welcomeImages: [
      { id: 1, name: 'Check In', emoji: '🔐', color: customTheme.colors.primary, description: 'Visitor check-in' },
      { id: 2, name: 'Meeting', emoji: '💼', color: customTheme.colors.secondary, description: 'Business meeting' },
      { id: 3, name: 'Delivery', emoji: '📦', color: customTheme.colors.info, description: 'Package delivery' },
      { id: 4, name: 'Support', emoji: '🛠️', color: customTheme.colors.warning, description: 'Technical support' },
      { id: 5, name: 'Guest', emoji: '👥', color: customTheme.colors.success, description: 'Guest visit' },
      { id: 6, name: 'Tour', emoji: '🏢', color: customTheme.colors.error, description: 'Facility tour' },
    ],
    fonts: {
      primary: customTheme.fonts.primary,
      secondary: customTheme.fonts.heading,
      weights: {
        light: '300',
        regular: '400',
        medium: '500',
        bold: '700',
      },
    },
    background: {
      type: 'gradient',
      gradient: {
        colors: [customTheme.colors.background, customTheme.colors.surface],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
    },
    borderRadius: {
      small: customTheme.borderRadius.sm,
      medium: customTheme.borderRadius.md,
      large: customTheme.borderRadius.lg,
    },
    shadow: {
      small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
      },
    },
  };
};

// Get active custom theme
export const getActiveCustomTheme = async (config?: any): Promise<CustomThemeActivation> => {
  try {
    // First try to get from database if config is available
    if (config && config.serverUrl && config.companyId) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (config.deviceToken) {
          headers['X-Device-Token'] = config.deviceToken;
        }

        const response = await fetch(`${config.serverUrl}/device/themes/active`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const activeThemeData = await response.json();
          if (activeThemeData && activeThemeData.theme) {
            const appTheme = convertCustomThemeToAppTheme(activeThemeData.theme);
            return {
              isActive: true,
              theme: appTheme,
              originalThemeId: activeThemeData.theme.id,
            };
          }
        }
      } catch (dbError) {
        console.log('Database not available, falling back to local storage');
      }
    }

    // Fallback to local storage
    const customThemeJson = await AsyncStorage.getItem(CUSTOM_THEME_KEY);
    if (customThemeJson) {
      const customTheme: CustomTheme = JSON.parse(customThemeJson);
      const appTheme = convertCustomThemeToAppTheme(customTheme);
      return {
        isActive: true,
        theme: appTheme,
        originalThemeId: customTheme.id,
      };
    }
    return { isActive: false };
  } catch (error) {
    console.error('Error getting active custom theme:', error);
    return { isActive: false };
  }
};

// Apply custom theme
export const applyCustomTheme = async (customTheme: CustomTheme, config?: any): Promise<void> => {
  try {
    // Try to activate theme via API if config is available
    if (config && config.serverUrl && config.companyId) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (config.deviceToken) {
          headers['X-Device-Token'] = config.deviceToken;
        }

        const response = await fetch(`${config.serverUrl}/device/themes/${customTheme.id}/activate`, {
          method: 'POST',
          headers,
        });

        if (response.ok) {
          console.log('Custom theme activated via API:', customTheme.name);
          // Also save locally as backup
          await AsyncStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(customTheme));
          return;
        } else {
          console.warn('Failed to activate theme via API, falling back to local storage');
        }
      } catch (apiError) {
        console.warn('API activation failed, falling back to local storage:', apiError);
      }
    }

    // Fallback to local storage
    await AsyncStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(customTheme));
    console.log('Custom theme applied locally:', customTheme.name);
  } catch (error) {
    console.error('Error applying custom theme:', error);
    throw error;
  }
};

// Clear custom theme (revert to built-in)
export const clearCustomTheme = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CUSTOM_THEME_KEY);
    console.log('Custom theme cleared');
  } catch (error) {
    console.error('Error clearing custom theme:', error);
    throw error;
  }
};