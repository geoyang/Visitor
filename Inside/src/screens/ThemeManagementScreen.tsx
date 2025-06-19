import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { useTheme, useEnhancedTheme } from '../contexts/EnhancedThemeContext';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';
import {
  CustomTheme,
  ThemePreset,
  THEME_PRESETS,
  validateTheme,
  ThemeColors,
  ThemeFonts,
  ThemeImages,
  ThemeLayoutConfig,
  ThemeFormConfig,
} from '../types/theme';
import { CustomForm } from '../types/formBuilder';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyCustomTheme, clearCustomTheme, getActiveCustomTheme } from '../utils/customThemeUtils';
import ColorPicker from '../components/ColorPicker';
import ThemePreview from '../components/ThemePreview';
import FontPicker from '../components/FontPicker';
// import { themes, ThemeType } from '../themes/themes';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface ThemeManagementScreenProps {
  onBack?: () => void;
}

const ThemeManagementScreen: React.FC<ThemeManagementScreenProps> = ({ onBack }) => {
  const { theme, refreshTheme } = useEnhancedTheme();
  const { config } = useSimpleDeviceConfig();
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<CustomTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'images' | 'layout' | 'forms' | 'preview'>('colors');
  const [showPreview, setShowPreview] = useState(false);
  const [activeCustomThemeId, setActiveCustomThemeId] = useState<string | null>(null);
  const [availableForms, setAvailableForms] = useState<CustomForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Theme emoji mapping
  const themeEmojis: Record<string, string> = {
    'hightech': '🚀',
    'lawfirm': '⚖️', 
    'metropolitan': '🏙️',
    'zen': '🧘'
  };

  useEffect(() => {
    loadAllThemes();
    loadForms();
  }, []);
  
  // When forms are loaded or selectedTheme changes, ensure formOrder includes all forms
  useEffect(() => {
    if (selectedTheme && availableForms.length > 0) {
      const currentFormOrder = selectedTheme.formConfig?.formOrder || [];
      const allFormIds = availableForms.map(f => f.id);
      
      // Check if we need to update formOrder to include all forms
      const missingFormIds = allFormIds.filter(id => !currentFormOrder.includes(id));
      
      if (missingFormIds.length > 0) {
        const updatedTheme = {
          ...selectedTheme,
          formConfig: {
            ...selectedTheme.formConfig,
            formOrder: [...currentFormOrder, ...missingFormIds],
          },
        };
        console.log('📋 Auto-populating formOrder with all forms');
        setSelectedTheme(updatedTheme);
      }
    }
  }, [availableForms, selectedTheme?.id]); // Only re-run when forms load or theme changes

  const loadAllThemesFromDatabase = async (): Promise<CustomTheme[]> => {
    if (!config) return [];

    try {
      // Load ALL themes (built-in + custom) from database with company isolation
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/device/themes`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const allThemes = await response.json();
        console.log('📥 Loaded themes from database:', allThemes.length);
        
        // If no themes in database, return built-in themes
        if (allThemes.length === 0) {
          console.log('Database is empty, loading built-in themes');
          return getBuiltInThemes();
        }
        
        allThemes.forEach((theme: any) => {
          console.log(`📥 Theme ${theme.name} (${theme.id}) formConfig:`, JSON.stringify(theme.formConfig, null, 2));
        });
        return allThemes.map((theme: any) => {
          const mappedTheme = {
            ...theme,
            createdAt: new Date(theme.createdAt),
            updatedAt: new Date(theme.updatedAt),
          };
          console.log(`📥 Mapped theme ${theme.name} formConfig:`, JSON.stringify(mappedTheme.formConfig, null, 2));
          return mappedTheme;
        });
      } else if (response.status === 404) {
        // No themes found for this company, fall back to hardcoded built-in themes
        console.log('No themes found in database, using hardcoded built-in themes');
        return getBuiltInThemes();
      } else {
        console.error('Failed to load themes from database:', response.status);
        // Fallback to hardcoded built-in themes
        return getBuiltInThemes();
      }
    } catch (error) {
      console.error('Error loading themes from database:', error);
      // Fallback to hardcoded built-in themes
      return getBuiltInThemes();
    }
  };

  const loadCustomThemes = async (): Promise<CustomTheme[]> => {
    // This method now loads custom themes only (for backward compatibility)
    const allThemes = await loadAllThemesFromDatabase();
    return allThemes.filter(theme => theme.category === 'custom');
  };

  const loadCustomThemesFromStorage = async (): Promise<CustomTheme[]> => {
    try {
      const customThemesJson = await AsyncStorage.getItem('customThemes');
      if (customThemesJson) {
        const customThemes = JSON.parse(customThemesJson);
        return customThemes.map((theme: any) => ({
          ...theme,
          createdAt: new Date(theme.createdAt),
          updatedAt: new Date(theme.updatedAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading custom themes from storage:', error);
      return [];
    }
  };

  const saveCustomThemes = async (customThemes: CustomTheme[]) => {
    try {
      await AsyncStorage.setItem('customThemes', JSON.stringify(customThemes));
    } catch (error) {
      console.error('Error saving custom themes:', error);
      throw error;
    }
  };

  const loadAllThemes = async () => {
    setIsLoading(true);
    try {
      const [allThemes, activeThemeData] = await Promise.all([
        loadAllThemesFromDatabase(),
        getActiveThemeFromDatabase()
      ]);
      
      // Set active theme ID for UI indicators
      if (activeThemeData && activeThemeData.isActive && activeThemeData.theme) {
        const activeThemeId = activeThemeData.theme.id;
        setActiveCustomThemeId(activeThemeId);
        console.log('Active theme ID:', activeThemeId);
      } else {
        setActiveCustomThemeId(null);
        console.log('No active theme');
      }
      
      console.log('Loaded all themes from database:', allThemes.length);
      
      // Log potential duplicates for debugging
      const themeNames = allThemes.map(t => t.name);
      const duplicateNames = themeNames.filter((name, index) => themeNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        console.log('⚠️ Potential duplicate themes found:', [...new Set(duplicateNames)]);
      }
      
      setThemes(allThemes);
    } catch (error) {
      console.error('Error loading themes:', error);
      Alert.alert('Error', 'Failed to load themes');
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveThemeFromDatabase = async () => {
    if (!config) return null;

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
        return await response.json();
      } else {
        console.error('Failed to get active theme:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error getting active theme:', error);
      return null;
    }
  };

  const getBuiltInThemes = (): CustomTheme[] => {
    console.log('Getting built-in themes...');
    
    // Built-in themes
    const builtInThemesData = [
        {
          id: 'hightech',
          name: 'High Tech',
          colors: { primary: '#0066ff', secondary: '#00d4aa', background: '#f8fafc', surface: '#ffffff', text: '#1e293b', textSecondary: '#64748b', error: '#ef4444', warning: '#f59e0b', success: '#10b981', info: '#3b82f6' }
        },
        {
          id: 'lawfirm', 
          name: 'Law Firm',
          colors: { primary: '#7c2d12', secondary: '#dc2626', background: '#fefefe', surface: '#ffffff', text: '#1c1917', textSecondary: '#57534e', error: '#dc2626', warning: '#ea580c', success: '#16a34a', info: '#2563eb' }
        },
        {
          id: 'metropolitan',
          name: 'Metropolitan', 
          colors: { primary: '#db2777', secondary: '#ec4899', background: '#fefefe', surface: '#ffffff', text: '#1f2937', textSecondary: '#6b7280', error: '#ef4444', warning: '#f59e0b', success: '#10b981', info: '#3b82f6' }
        },
        {
          id: 'zen',
          name: 'Calm Zen',
          colors: { primary: '#059669', secondary: '#10b981', background: '#f0fdf4', surface: '#ffffff', text: '#1f2937', textSecondary: '#6b7280', error: '#dc2626', warning: '#ea580c', success: '#16a34a', info: '#0891b2' }
        }
      ];
      
      // Convert built-in themes to CustomTheme format
      const builtInThemes: CustomTheme[] = builtInThemesData.map((theme) => ({
            id: theme.id,
            name: theme.name,
            description: `Built-in ${theme.name} theme`,
            category: 'default' as const,
            status: 'active' as const,
            colors: {
              primary: theme.colors.primary,
              secondary: theme.colors.secondary,
              background: theme.colors.background,
              surface: theme.colors.surface,
              text: theme.colors.text,
              textSecondary: theme.colors.textSecondary,
              error: theme.colors.error,
              warning: theme.colors.warning,
              success: theme.colors.success,
              info: theme.colors.info,
              border: theme.colors.textSecondary,
              headerBackground: theme.colors.primary,
              headerText: '#ffffff',
              buttonBackground: theme.colors.primary,
              buttonText: '#ffffff',
              linkColor: theme.colors.primary,
            },
            fonts: {
              primary: 'System',
              heading: 'System',
              body: 'System',
              button: 'System',
              sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 },
              weights: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' },
            },
            images: { logo: '', background: '', welcomeImage: '' },
            spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
            borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
            shadows: { none: 'none', sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
            animations: { duration: { fast: 150, normal: 300, slow: 500 }, easing: { linear: 'linear', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out' } },
            formConfig: { defaultFormIds: [], formOrder: [], hiddenFormIds: [], formStyles: {} },
            layoutConfig: { showLogo: true, logoPosition: 'center', showCompanyName: true, showWelcomeMessage: true, welcomeMessage: 'Welcome!', showDateTime: true, showLocationInfo: true },
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            companyId: config?.companyId || '',
            version: 1,
          }));
      
      console.log('Converted themes:', builtInThemes);
      return builtInThemes;
  };

  const createNewTheme = (preset?: ThemePreset) => {
    const baseTheme = preset?.theme || THEME_PRESETS[0].theme;
    
    const newTheme: CustomTheme = {
      id: `theme_${Date.now()}`,
      name: preset?.name || 'New Theme',
      description: preset?.description || '',
      category: 'custom',
      status: 'draft',
      colors: baseTheme.colors || {
        primary: '#2563eb',
        secondary: '#3b82f6',
        background: '#ffffff',
        surface: '#f3f4f6',
        text: '#111827',
        textSecondary: '#6b7280',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
        border: '#e5e7eb',
        headerBackground: '#2563eb',
        headerText: '#ffffff',
        buttonBackground: '#2563eb',
        buttonText: '#ffffff',
        linkColor: '#2563eb',
      },
      fonts: baseTheme.fonts || {
        primary: 'System',
        heading: 'System',
        body: 'System',
        button: 'System',
        sizes: {
          xs: 10,
          sm: 12,
          md: 14,
          lg: 16,
          xl: 20,
          xxl: 24,
        },
        weights: {
          light: '300',
          regular: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      images: {
        logo: '',
        background: '',
        welcomeImage: '',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
      },
      borderRadius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
      },
      shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      animations: {
        duration: {
          fast: 150,
          normal: 300,
          slow: 500,
        },
        easing: {
          linear: 'linear',
          easeIn: 'ease-in',
          easeOut: 'ease-out',
          easeInOut: 'ease-in-out',
        },
      },
      formConfig: {
        defaultFormIds: [],
        formOrder: [],
        hiddenFormIds: [],
        formStyles: {},
      },
      layoutConfig: {
        showLogo: true,
        logoPosition: 'center',
        showCompanyName: true,
        showWelcomeMessage: true,
        welcomeMessage: 'Welcome!',
        showDateTime: true,
        showLocationInfo: true,
      },
      createdBy: config?.deviceId || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: config?.companyId || '',
      version: 1,
    };

    setSelectedTheme(newTheme);
    setShowEditor(true);
    setShowPresetPicker(false);
  };

  // Helper function to compress large images
  const compressImageData = (imageData: string): string => {
    if (!imageData || !imageData.startsWith('data:image/')) {
      return imageData;
    }
    
    try {
      // For very large images, we'll reduce quality/size
      // This is a simple approach - in production you'd use a proper image compression library
      const sizeKB = imageData.length / 1024;
      
      if (sizeKB > 500) { // If larger than 500KB
        console.log(`🗜️ Compressing large image (${sizeKB.toFixed(2)} KB)`);
        
        // Simple compression by reducing the base64 data (this is a hack for demo)
        // In production, you'd use ImageManipulator from expo-image-manipulator
        const base64Data = imageData.split(',')[1];
        const header = imageData.split(',')[0];
        
        // Reduce data by taking every other character (very crude compression)
        if (sizeKB > 1000) {
          const compressedBase64 = base64Data.split('').filter((_, index) => index % 2 === 0).join('');
          const compressed = `${header},${compressedBase64}`;
          console.log(`🗜️ Compressed from ${sizeKB.toFixed(2)} KB to ${(compressed.length / 1024).toFixed(2)} KB`);
          return compressed;
        }
      }
      
      return imageData;
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageData;
    }
  };

  // Helper function to optimize theme for upload
  const optimizeThemeForUpload = (theme: CustomTheme): CustomTheme => {
    const optimizedTheme = { ...theme };
    
    // Compress images if they exist
    if (optimizedTheme.images) {
      const compressedImages = { ...optimizedTheme.images };
      
      Object.keys(compressedImages).forEach(key => {
        if (compressedImages[key as keyof ThemeImages]) {
          compressedImages[key as keyof ThemeImages] = compressImageData(
            compressedImages[key as keyof ThemeImages] as string
          ) as any;
        }
      });
      
      optimizedTheme.images = compressedImages;
    }
    
    return optimizedTheme;
  };

  // Helper function to check payload size and warn about large data
  const checkPayloadSize = (theme: CustomTheme) => {
    const themeString = JSON.stringify(theme);
    const payloadSize = themeString.length;
    const payloadSizeKB = payloadSize / 1024;
    
    console.log(`💾 Theme payload size: ${payloadSize} bytes (${payloadSizeKB.toFixed(2)} KB)`);
    
    // Check for large images
    if (theme.images) {
      Object.entries(theme.images).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.length > 1000) {
          const imageSizeKB = value.length / 1024;
          console.log(`🖼️ Large image in ${key}: ${imageSizeKB.toFixed(2)} KB`);
          
          if (imageSizeKB > 500) { // Warn about images larger than 500KB
            console.warn(`⚠️ Very large image in ${key}: ${imageSizeKB.toFixed(2)} KB - consider optimizing`);
          }
        }
      });
    }
    
    if (payloadSizeKB > 5000) { // Warn about payloads larger than 5MB
      console.warn(`⚠️ Large theme payload: ${payloadSizeKB.toFixed(2)} KB - may cause upload issues`);
      return false;
    }
    
    return true;
  };

  const saveTheme = async (theme: CustomTheme) => {
    if (!config) {
      Alert.alert('Error', 'Device not configured');
      return;
    }

    const validation = validateTheme(theme);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }

    setIsSaving(true);
    
    try {
      await performSave();
    } finally {
      setIsSaving(false);
    }

    async function performSave() {
    try {
      // Check payload size before upload
      console.log('💾 Checking theme size...');
      const payloadOk = checkPayloadSize(theme);
      if (!payloadOk) {
        Alert.alert(
          'Upload Failed', 
          'Theme is too large (over 5MB). Please use smaller images.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Built-in themes can now be modified since we have a reset button
      // const builtInThemeIds = ['hightech', 'lawfirm', 'metropolitan', 'zen'];
      // if (builtInThemeIds.includes(theme.id)) {
      //   Alert.alert('Built-in Theme', 'Built-in themes cannot be modified. Please create a copy to customize.');
      //   return;
      // }

      // Update theme with company info and timestamp
      const updatedTheme = {
        ...theme, // Use original theme
        companyId: config.companyId,
        updatedAt: new Date(),
        createdAt: theme.createdAt || new Date(),
        // Ensure formConfig exists with proper structure
        formConfig: theme.formConfig || {
          defaultFormIds: [],
          formOrder: [],
          hiddenFormIds: [],
          formStyles: {},
        },
      };
      
      console.log('💾 saveTheme - Saving theme:', theme.name);
      console.log('💾 saveTheme - FormConfig:', JSON.stringify(updatedTheme.formConfig, null, 2));

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      // Check if theme exists by looking in ALL themes (both built-in and custom)
      const allThemes = await loadAllThemesFromDatabase();
      console.log('💾 Total themes in database:', allThemes.length);
      console.log('💾 Looking for theme ID:', theme.id);
      console.log('💾 Available theme IDs:', allThemes.map(t => t.id).slice(0, 10), '...'); // Show first 10
      
      const existingTheme = allThemes.find(t => t.id === theme.id);
      
      const isNew = !existingTheme;
      console.log('💾 Checking if theme exists:', theme.id, 'Found:', !!existingTheme, 'IsNew:', isNew);
      const url = isNew
        ? `${config.serverUrl}/device/themes`
        : `${config.serverUrl}/device/themes/${theme.id}`;
      const method = isNew ? 'POST' : 'PUT';

      // Save to database
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(updatedTheme),
      });

      if (response.ok) {
        // Reload themes from database
        await loadAllThemes();
        
        // If this is the currently active theme, apply the changes immediately
        console.log('🔄 Theme save check:', {
          savedThemeId: theme.id,
          activeCustomThemeId: activeCustomThemeId,
          isMatch: activeCustomThemeId === theme.id
        });
        
        if (activeCustomThemeId === theme.id) {
          console.log('Updated theme is currently active, applying changes...');
          
          try {
            // Apply the updated theme data directly (including visual changes)
            await Promise.race([
              applyCustomTheme(updatedTheme, config),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Theme apply timeout')), 5000))
            ]);
            
            await Promise.race([
              refreshTheme(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Theme refresh timeout')), 5000))
            ]);
            
            // Close modal first, then show alert
            setShowEditor(false);
            setTimeout(() => {
              Alert.alert(
                'Success', 
                `Theme ${isNew ? 'created' : 'updated'} and applied successfully! Visual changes and form configuration are now active.`
              );
            }, 100);
          } catch (error) {
            console.error('Theme apply/refresh failed:', error);
            // Close modal first, then show alert
            setShowEditor(false);
            setTimeout(() => {
              Alert.alert(
                'Partial Success', 
                `Theme ${isNew ? 'created' : 'updated'} successfully but may require app restart to see changes.`
              );
            }, 100);
          }
        } else {
          // Even if it's not the active theme, just show success without refreshing
          console.log('Theme saved but not currently active, skipping refresh...');
          // Close modal first, then show alert
          setShowEditor(false);
          setTimeout(() => {
            Alert.alert('Success', `Theme ${isNew ? 'created' : 'updated'} successfully`);
          }, 100);
        }
      } else {
        const errorData = await response.text();
        console.error('Database save failed:', response.status, errorData);
        
        // Fallback to local storage
        await saveThemeLocally(updatedTheme);
        
        // If this is the currently active theme, apply the changes immediately
        if (activeCustomThemeId === updatedTheme.id) {
          console.log('Updated theme is currently active, applying local changes...');
          await applyCustomTheme(updatedTheme, config);
          await refreshTheme();
          // Close modal first, then show alert
          setShowEditor(false);
          setTimeout(() => {
            Alert.alert(
              'Saved Locally', 
              'Theme saved to device and applied! Visual changes and form configuration are now active. Will sync to database when connection is available.'
            );
          }, 100);
        } else {
          // Close modal first, then show alert
          setShowEditor(false);
          setTimeout(() => {
            Alert.alert('Saved Locally', 'Theme saved to device. Will sync to database when connection is available.');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Save theme error:', error);
      
      // Fallback to local storage
      try {
        const updatedTheme = {
          ...theme,
          companyId: config.companyId,
          updatedAt: new Date(),
          createdAt: theme.createdAt || new Date(),
        };
        
        await saveThemeLocally(updatedTheme);
        
        // If this is the currently active theme, apply the changes immediately
        if (activeCustomThemeId === updatedTheme.id) {
          console.log('Updated theme is currently active, applying local fallback changes...');
          await applyCustomTheme(updatedTheme, config);
          await refreshTheme();
          // Close modal first, then show alert
          setShowEditor(false);
          setTimeout(() => {
            Alert.alert(
              'Saved Locally', 
              'Theme saved to device and applied! Visual changes and form configuration are now active. Will sync to database when connection is available.'
            );
          }, 100);
        } else {
          // Close modal first, then show alert
          setShowEditor(false);
          setTimeout(() => {
            Alert.alert('Saved Locally', 'Theme saved to device. Will sync to database when connection is available.');
          }, 100);
        }
      } catch (localError) {
        Alert.alert('Error', 'Failed to save theme');
      }
    }
    }
  };

  const saveThemeLocally = async (theme: CustomTheme) => {
    const customThemes = await loadCustomThemesFromStorage();
    const existingIndex = customThemes.findIndex(t => t.id === theme.id);
    
    let updatedCustomThemes;
    if (existingIndex >= 0) {
      updatedCustomThemes = [...customThemes];
      updatedCustomThemes[existingIndex] = theme;
    } else {
      updatedCustomThemes = [...customThemes, theme];
    }

    await saveCustomThemes(updatedCustomThemes);
    
    // Update UI
    const builtInThemes = getBuiltInThemes();
    const allThemes = [...builtInThemes, ...updatedCustomThemes];
    setThemes(allThemes);
  };

  const deleteTheme = (themeId: string) => {
    // Check if this is a built-in theme (cannot be deleted)
    const builtInThemeIds = ['hightech', 'lawfirm', 'metropolitan', 'zen'];
    if (builtInThemeIds.includes(themeId)) {
      Alert.alert('Built-in Theme', 'Built-in themes cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Theme',
      'Are you sure you want to delete this theme? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!config) {
              Alert.alert('Error', 'Device not configured');
              return;
            }

            try {
              // Prepare headers
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };

              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }

              // Delete from database
              const response = await fetch(`${config.serverUrl}/device/themes/${themeId}`, {
                method: 'DELETE',
                headers,
              });

              if (response.ok) {
                // Reload themes from database
                await loadAllThemes();
                Alert.alert('Success', 'Theme deleted successfully');
              } else {
                console.error('Database delete failed:', response.status);
                
                // Fallback to local deletion
                await deleteThemeLocally(themeId);
                Alert.alert('Deleted Locally', 'Theme deleted from device. Will sync to database when connection is available.');
              }
            } catch (error) {
              console.error('Delete theme error:', error);
              
              // Fallback to local deletion
              try {
                await deleteThemeLocally(themeId);
                Alert.alert('Deleted Locally', 'Theme deleted from device. Will sync to database when connection is available.');
              } catch (localError) {
                Alert.alert('Error', 'Failed to delete theme');
              }
            }
          },
        },
      ]
    );
  };

  const deleteThemeLocally = async (themeId: string) => {
    const customThemes = await loadCustomThemesFromStorage();
    const updatedCustomThemes = customThemes.filter(t => t.id !== themeId);
    
    await saveCustomThemes(updatedCustomThemes);
    
    // Update UI
    const builtInThemes = getBuiltInThemes();
    const allThemes = [...builtInThemes, ...updatedCustomThemes];
    setThemes(allThemes);
  };

  const applyTheme = async (themeId: string) => {
    if (!config) return;

    try {
      // Find the theme to activate
      const themeToActivate = themes.find(t => t.id === themeId);
      if (!themeToActivate) {
        Alert.alert('Error', 'Theme not found');
        return;
      }

      // Set loading state for the specific theme
      setIsLoading(true);

      // Use device API to activate theme (works for both built-in and custom themes)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/device/themes/${themeId}/activate`, {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        // Update the active theme ID for UI
        setActiveCustomThemeId(themeId);
        
        // Also save to local storage as backup
        await applyCustomTheme(themeToActivate, config);
        
        // Refresh the main app's theme context to apply changes immediately
        await refreshTheme();
        
        // Reload themes to update UI indicators
        await loadAllThemes();
        
        Alert.alert(
          'Theme Activated', 
          `"${themeToActivate.name}" is now your active theme and has been applied to the app.`,
          [{ text: 'OK' }]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to activate theme');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate theme');
      console.error('Apply theme error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToBase64 = async (uri: string): Promise<string | null> => {
    try {
      console.log(`📸 Converting image to base64: ${uri.substring(0, 50)}...`);
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determine the MIME type based on the file extension
      const mimeType = uri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
      
      // Create a data URI
      const dataUri = `data:${mimeType};base64,${base64}`;
      
      console.log(`📸 Image converted to base64, size: ${(dataUri.length / 1024).toFixed(1)}KB`);
      
      return dataUri;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      return null;
    }
  };

  const pickImage = async (type: keyof ThemeImages) => {
    try {
      console.log(`📸 Picking image for ${type}...`);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.7, // Reduce quality to prevent huge files
        allowsMultipleSelection: false,
      });

      if (!result.canceled && selectedTheme && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log(`📸 Image selected: ${asset.width}x${asset.height}, size: ${(asset.fileSize || 0) / 1024}KB`);
        
        // Check file size to prevent freeze
        const fileSizeKB = (asset.fileSize || 0) / 1024;
        if (fileSizeKB > 5000) { // Warn about files larger than 5MB
          Alert.alert(
            'Large Image Warning', 
            `This image is ${fileSizeKB.toFixed(0)}KB which may cause performance issues. Consider using a smaller image (under 5MB).`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use Anyway', onPress: async () => {
                const base64Data = await convertToBase64(asset.uri);
                if (base64Data) {
                  updateThemeImage(type, base64Data);
                }
              }}
            ]
          );
          return;
        }
        
        // Convert image to base64 before updating theme
        const base64Data = await convertToBase64(asset.uri);
        if (base64Data) {
          updateThemeImage(type, base64Data);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const updateThemeImage = (type: keyof ThemeImages, uri: string) => {
    if (!selectedTheme) return;
    
    console.log(`📸 Updating theme image ${type} with URI: ${uri.substring(0, 50)}...`);
    
    const updatedTheme = {
      ...selectedTheme,
      images: {
        ...selectedTheme.images,
        [type]: uri,
      },
    };
    
    setSelectedTheme(updatedTheme);
    console.log(`✅ Theme image ${type} updated successfully`);
  };

  const deleteThemeImage = (type: keyof ThemeImages) => {
    if (!selectedTheme) return;
    
    console.log(`🗑️ Deleting theme image ${type}...`);
    
    const updatedTheme = {
      ...selectedTheme,
      images: {
        ...selectedTheme.images,
        [type]: undefined,
      },
    };
    
    setSelectedTheme(updatedTheme);
    console.log(`✅ Theme image ${type} deleted successfully`);
  };

  const confirmDeleteImage = (type: keyof ThemeImages) => {
    const imageTypeNames = {
      logo: 'Logo',
      background: 'Background',
      welcome: 'Welcome Image'
    };
    
    Alert.alert(
      'Delete Image',
      `Are you sure you want to delete the ${imageTypeNames[type]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteThemeImage(type) }
      ]
    );
  };

  const cleanupDuplicateThemes = async () => {
    if (!config) {
      Alert.alert('Error', 'Device not configured');
      return;
    }

    Alert.alert(
      'Reset to Default Themes',
      'This will remove ALL custom themes and keep only the 4 built-in themes (High Tech, Law Firm, Metropolitan, Calm Zen). This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Defaults',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              const allThemes = await loadAllThemesFromDatabase();
              
              // Find all themes that are NOT built-in
              const builtInIds = ['hightech', 'lawfirm', 'metropolitan', 'zen'];
              const customThemes = allThemes.filter(theme => !builtInIds.includes(theme.id));
              
              if (customThemes.length === 0) {
                Alert.alert('No Custom Themes', 'No custom themes found. Only built-in themes are present.');
                return;
              }
              
              console.log(`🧹 Found ${customThemes.length} custom themes to delete`);
              customThemes.forEach(theme => {
                console.log(`📋 Theme to delete: ${theme.name} (ID: ${theme.id}, _id: ${theme._id || 'N/A'})`);
              });
              
              // Prepare headers for API calls
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }
              
              // First, if there's an active custom theme, we need to activate a built-in theme
              if (activeCustomThemeId && !builtInIds.includes(activeCustomThemeId)) {
                console.log('🔄 Active theme is custom, switching to built-in theme first...');
                
                try {
                  // Activate the first built-in theme (High Tech)
                  const activateResponse = await fetch(`${config.serverUrl}/device/themes/${builtInIds[0]}/activate`, {
                    method: 'POST',
                    headers,
                  });
                  
                  if (activateResponse.ok) {
                    console.log('✅ Activated built-in theme: High Tech');
                    setActiveCustomThemeId(builtInIds[0]);
                    // Wait a bit for the activation to process
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } else {
                    console.error('❌ Failed to activate built-in theme');
                  }
                } catch (error) {
                  console.error('❌ Error activating built-in theme:', error);
                }
              }
              
              let deletedCount = 0;
              let failedCount = 0;
              
              // Delete ALL custom themes
              for (const themeToDelete of customThemes) {
                try {
                  // Try using _id if it exists, otherwise use id
                  const themeIdToDelete = themeToDelete._id || themeToDelete.id;
                  console.log(`🗑️ Deleting theme: ${themeToDelete.name} (using ID: ${themeIdToDelete})`);
                  
                  const response = await fetch(`${config.serverUrl}/device/themes/${themeIdToDelete}`, {
                    method: 'DELETE',
                    headers,
                  });
                  
                  if (response.ok) {
                    deletedCount++;
                    console.log(`✅ Successfully deleted: ${themeToDelete.name}`);
                  } else {
                    failedCount++;
                    const errorText = await response.text();
                    console.error(`❌ Failed to delete: ${themeToDelete.name} - Status: ${response.status}`);
                    console.error(`❌ Error details: ${errorText}`);
                    
                    // If it's because the theme is active, note that specifically
                    if (response.status === 400 && errorText.includes('active theme')) {
                      console.error(`❌ Cannot delete because theme is currently active`);
                    }
                  }
                } catch (error) {
                  failedCount++;
                  console.error(`❌ Error deleting theme ${themeToDelete.name}:`, error);
                }
              }
              
              // Clear local custom theme if needed
              if (activeCustomThemeId && !builtInIds.includes(activeCustomThemeId)) {
                await clearCustomTheme();
              }
              
              // Reload themes (should now only show built-in themes)
              await loadAllThemes();
              
              const message = failedCount > 0 
                ? `Reset complete. Removed ${deletedCount} themes. ${failedCount} themes could not be deleted.`
                : `Reset complete! Removed all ${deletedCount} custom themes. Only built-in themes remain.`;
              
              Alert.alert('Reset Complete', message);
              
            } catch (error) {
              console.error('Cleanup error:', error);
              Alert.alert('Error', 'Failed to cleanup themes');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const restoreBuiltInThemes = async () => {
    if (!config) {
      Alert.alert('Error', 'Device not configured');
      return;
    }

    try {
      setIsLoading(true);
      
      const builtInThemes = getBuiltInThemes();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }
      
      let savedCount = 0;
      
      for (const theme of builtInThemes) {
        try {
          console.log(`📤 Saving built-in theme: ${theme.name}`);
          
          const response = await fetch(`${config.serverUrl}/device/themes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(theme),
          });
          
          if (response.ok) {
            savedCount++;
            console.log(`✅ Saved: ${theme.name}`);
          } else {
            console.error(`❌ Failed to save: ${theme.name}`);
          }
        } catch (error) {
          console.error(`❌ Error saving theme ${theme.name}:`, error);
        }
      }
      
      await loadAllThemes();
      Alert.alert('Restore Complete', `Restored ${savedCount} built-in themes.`);
      
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore themes');
    } finally {
      setIsLoading(false);
    }
  };

  const exportTheme = async (theme: CustomTheme) => {
    try {
      const themeData = {
        ...theme,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
      };
      
      const themeJson = JSON.stringify(themeData, null, 2);
      
      Alert.alert(
        'Export Theme', 
        'Theme data (copy this to share or backup):', 
        [
          { text: 'Close', style: 'cancel' },
          { 
            text: 'Copy', 
            onPress: () => {
              // In a real app, you'd use Clipboard.setString(themeJson)
              console.log('Theme exported:', themeJson);
              Alert.alert('Success', 'Theme data copied to console');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export theme');
      console.error('Export theme error:', error);
    }
  };

  const duplicateTheme = (theme: CustomTheme) => {
    const duplicatedTheme: CustomTheme = {
      ...theme,
      id: `theme_${Date.now()}`,
      name: `${theme.name} (Copy)`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    
    setSelectedTheme(duplicatedTheme);
    setShowEditor(true);
  };

  const renderThemeCard = (theme: CustomTheme) => {
    const statusColor = {
      draft: '#6b7280',
      active: '#10b981',
      inactive: '#f59e0b',
    }[theme.status];

    const isActiveCustomTheme = activeCustomThemeId === theme.id;
    const builtInThemeIds = ['hightech', 'lawfirm', 'metropolitan', 'zen'];
    const isBuiltInTheme = builtInThemeIds.some(id => theme.id.includes(id)) || theme.category === 'default';

    return (
      <TouchableOpacity
        key={theme.id}
        style={[styles.themeCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => {
          console.log('🎨 Theme selected for editing:', theme.name);
          console.log('🎨 Theme ID:', theme.id);
          console.log('🎨 Current formConfig:', JSON.stringify(theme.formConfig, null, 2));
          setSelectedTheme(theme);
          setShowEditor(true);
        }}
      >
        <View style={styles.themePreview}>
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary }]} />
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.background }]} />
          <View style={[styles.colorSwatch, { backgroundColor: theme.colors.text }]} />
          
          {isActiveCustomTheme && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeIndicatorText}>ACTIVE</Text>
            </View>
          )}
        </View>
        
        <View style={styles.themeInfo}>
          <View style={styles.themeHeader}>
            <Text style={styles.themeEmoji}>
              {themeEmojis[theme.id] || '🎨'}
            </Text>
            <Text style={[styles.themeName, { color: theme.colors.text }]}>
              {theme.name} {activeCustomThemeId === theme.id ? '(ACTIVE)' : ''}
            </Text>
          </View>
          <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
            {theme.description || 'No description'}
          </Text>
          <View style={styles.themeMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{theme.status}</Text>
            </View>
            <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
              {theme.category}
            </Text>
          </View>
        </View>
        
        <View style={styles.themeActions}>
          <TouchableOpacity
            style={[
              styles.smallActionButton, 
              { 
                backgroundColor: isActiveCustomTheme ? '#10b981' : theme.colors.primary,
                opacity: isActiveCustomTheme ? 0.8 : 1
              }
            ]}
            onPress={() => applyTheme(theme.id)}
          >
            <Text style={styles.smallActionButtonText}>
              {isActiveCustomTheme ? 'Active' : 'Apply'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallActionButton, { backgroundColor: '#6b7280' }]}
            onPress={() => duplicateTheme(theme)}
          >
            <Text style={styles.smallActionButtonText}>Copy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallActionButton, { backgroundColor: '#059669' }]}
            onPress={() => exportTheme(theme)}
          >
            <Text style={styles.smallActionButtonText}>Export</Text>
          </TouchableOpacity>
          
          {!['hightech', 'lawfirm', 'metropolitan', 'zen'].includes(theme.id) && (
            <TouchableOpacity
              style={[styles.smallActionButton, { backgroundColor: '#ef4444' }]}
              onPress={() => deleteTheme(theme.id)}
            >
              <Text style={styles.smallActionButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderColorEditor = () => {
    if (!selectedTheme) return null;

    const colorKeys = Object.keys(selectedTheme.colors) as (keyof ThemeColors)[];

    return (
      <ScrollView style={styles.editorSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Colors
        </Text>
        
        {colorKeys.map((colorKey) => (
          <View key={colorKey} style={styles.colorRow}>
            <Text style={[styles.colorLabel, { color: theme.colors.text }]}>
              {colorKey.replace(/([A-Z])/g, ' $1').trim()}
            </Text>
            <View style={styles.colorInputContainer}>
              <ColorPicker
                color={selectedTheme.colors[colorKey]}
                onColorChange={(value) => {
                  const updatedTheme = {
                    ...selectedTheme,
                    colors: {
                      ...selectedTheme.colors,
                      [colorKey]: value,
                    },
                  };
                  setSelectedTheme(updatedTheme);
                }}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderFontEditor = () => {
    if (!selectedTheme) return null;

    return (
      <ScrollView style={styles.editorSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Fonts
        </Text>
        
        <FontPicker
          label="Primary Font"
          selectedFont={selectedTheme.fonts.primary}
          onFontChange={(value) => {
            const updatedTheme = {
              ...selectedTheme,
              fonts: {
                ...selectedTheme.fonts,
                primary: value,
              },
            };
            setSelectedTheme(updatedTheme);
          }}
          theme={theme}
        />

        <FontPicker
          label="Heading Font"
          selectedFont={selectedTheme.fonts.heading}
          onFontChange={(value) => {
            const updatedTheme = {
              ...selectedTheme,
              fonts: {
                ...selectedTheme.fonts,
                heading: value,
              },
            };
            setSelectedTheme(updatedTheme);
          }}
          theme={theme}
        />

        <FontPicker
          label="Body Font"
          selectedFont={selectedTheme.fonts.body}
          onFontChange={(value) => {
            const updatedTheme = {
              ...selectedTheme,
              fonts: {
                ...selectedTheme.fonts,
                body: value,
              },
            };
            setSelectedTheme(updatedTheme);
          }}
          theme={theme}
        />

        <FontPicker
          label="Button Font"
          selectedFont={selectedTheme.fonts.button}
          onFontChange={(value) => {
            const updatedTheme = {
              ...selectedTheme,
              fonts: {
                ...selectedTheme.fonts,
                button: value,
              },
            };
            setSelectedTheme(updatedTheme);
          }}
          theme={theme}
        />

        <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>
          Font Sizes
        </Text>
        
        {Object.entries(selectedTheme.fonts.sizes).map(([key, value]) => (
          <View key={key} style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {key.toUpperCase()}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={String(value)}
              onChangeText={(text) => {
                const updatedTheme = {
                  ...selectedTheme,
                  fonts: {
                    ...selectedTheme.fonts,
                    sizes: {
                      ...selectedTheme.fonts.sizes,
                      [key]: parseInt(text) || 0,
                    },
                  },
                };
                setSelectedTheme(updatedTheme);
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderImageEditor = () => {
    if (!selectedTheme) return null;

    return (
      <ScrollView style={styles.editorSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Images
        </Text>
        
        <View style={styles.imageContainer}>
          <Text style={[styles.imageLabel, { color: theme.colors.text }]}>Logo</Text>
          <TouchableOpacity
            style={[styles.imageUploadButton, { borderColor: theme.colors.border }]}
            onPress={() => pickImage('logo')}
          >
            {selectedTheme.images.logo ? (
              <Image 
                source={{ uri: selectedTheme.images.logo }} 
                style={styles.imagePreview}
                onError={(error) => {
                  console.error('Error loading logo image:', error);
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
                Upload Logo
              </Text>
            )}
          </TouchableOpacity>
          {selectedTheme.images.logo && (
            <TouchableOpacity
              style={[styles.deleteImageButton, { backgroundColor: theme.colors.error }]}
              onPress={() => confirmDeleteImage('logo')}
            >
              <Text style={styles.deleteImageText}>🗑️ Delete Logo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.imageContainer}>
          <Text style={[styles.imageLabel, { color: theme.colors.text }]}>Background</Text>
          <TouchableOpacity
            style={[styles.imageUploadButton, { borderColor: theme.colors.border }]}
            onPress={() => pickImage('background')}
          >
            {selectedTheme.images.background ? (
              <Image 
                source={{ uri: selectedTheme.images.background }} 
                style={styles.imagePreview}
                onError={(error) => {
                  console.error('Error loading background image:', error);
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
                Upload Background
              </Text>
            )}
          </TouchableOpacity>
          {selectedTheme.images.background && (
            <TouchableOpacity
              style={[styles.deleteImageButton, { backgroundColor: theme.colors.error }]}
              onPress={() => confirmDeleteImage('background')}
            >
              <Text style={styles.deleteImageText}>🗑️ Delete Background</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.imageContainer}>
          <Text style={[styles.imageLabel, { color: theme.colors.text }]}>Welcome Image</Text>
          <TouchableOpacity
            style={[styles.imageUploadButton, { borderColor: theme.colors.border }]}
            onPress={() => pickImage('welcomeImage')}
          >
            {selectedTheme.images.welcomeImage ? (
              <Image 
                source={{ uri: selectedTheme.images.welcomeImage }} 
                style={styles.imagePreview}
                onError={(error) => {
                  console.error('Error loading welcome image:', error);
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
                Upload Welcome Image
              </Text>
            )}
          </TouchableOpacity>
          {selectedTheme.images.welcomeImage && (
            <TouchableOpacity
              style={[styles.deleteImageButton, { backgroundColor: theme.colors.error }]}
              onPress={() => confirmDeleteImage('welcomeImage')}
            >
              <Text style={styles.deleteImageText}>🗑️ Delete Welcome Image</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderLayoutEditor = () => {
    if (!selectedTheme) return null;

    return (
      <ScrollView style={styles.editorSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Layout Configuration
        </Text>
        
        <View style={styles.switchGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Show Logo</Text>
          <Switch
            value={selectedTheme.layoutConfig.showLogo}
            onValueChange={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                layoutConfig: {
                  ...selectedTheme.layoutConfig,
                  showLogo: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Show Company Name</Text>
          <Switch
            value={selectedTheme.layoutConfig.showCompanyName}
            onValueChange={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                layoutConfig: {
                  ...selectedTheme.layoutConfig,
                  showCompanyName: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Welcome Message</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={selectedTheme.layoutConfig.welcomeMessage || ''}
            onChangeText={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                layoutConfig: {
                  ...selectedTheme.layoutConfig,
                  welcomeMessage: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            placeholder="Welcome!"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Show Date/Time</Text>
          <Switch
            value={selectedTheme.layoutConfig.showDateTime}
            onValueChange={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                layoutConfig: {
                  ...selectedTheme.layoutConfig,
                  showDateTime: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Show Location Info</Text>
          <Switch
            value={selectedTheme.layoutConfig.showLocationInfo}
            onValueChange={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                layoutConfig: {
                  ...selectedTheme.layoutConfig,
                  showLocationInfo: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>
      </ScrollView>
    );
  };

  const loadForms = async () => {
    if (!config) return;

    try {
      setLoadingForms(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/forms`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const forms = await response.json();
        setAvailableForms(forms.map((form: any) => ({
          ...form,
          createdAt: new Date(form.createdAt),
          updatedAt: new Date(form.updatedAt),
        })));
      } else {
        console.error('Failed to load forms:', response.status);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoadingForms(false);
    }
  };

  const toggleFormDefault = (formId: string) => {
    if (!selectedTheme) return;

    const currentDefaults = selectedTheme.formConfig?.defaultFormIds || [];
    const currentFormOrder = selectedTheme.formConfig?.formOrder || [];
    const isCurrentlyDefault = currentDefaults.includes(formId);
    
    let newDefaults;
    let newFormOrder;
    
    if (isCurrentlyDefault) {
      // Remove from defaults and form order
      newDefaults = currentDefaults.filter(id => id !== formId);
      newFormOrder = currentFormOrder.filter(id => id !== formId);
    } else {
      // Add to defaults and ensure it's in form order
      newDefaults = [...currentDefaults, formId];
      
      // Add to form order if not already present
      if (!currentFormOrder.includes(formId)) {
        newFormOrder = [...currentFormOrder, formId];
      } else {
        newFormOrder = currentFormOrder;
      }
    }

    const updatedTheme = {
      ...selectedTheme,
      formConfig: {
        ...selectedTheme.formConfig,
        defaultFormIds: newDefaults,
        formOrder: newFormOrder,
        hiddenFormIds: selectedTheme.formConfig?.hiddenFormIds || [],
        formStyles: selectedTheme.formConfig?.formStyles || {},
      },
    };
    
    console.log('🔧 toggleFormDefault - Form selection changed');
    console.log('🎯 Form ID:', formId);
    console.log('🎯 Was default:', isCurrentlyDefault);
    console.log('🎯 New defaults array:', newDefaults);
    console.log('🎯 New form order:', newFormOrder);
    console.log('🎯 Updated formConfig:', JSON.stringify(updatedTheme.formConfig, null, 2));
    
    setSelectedTheme(updatedTheme);
  };

  const toggleFormVisibility = (formId: string) => {
    if (!selectedTheme) return;

    const currentHidden = selectedTheme.formConfig.hiddenFormIds || [];
    const isCurrentlyHidden = currentHidden.includes(formId);
    
    let newHidden;
    if (isCurrentlyHidden) {
      newHidden = currentHidden.filter(id => id !== formId);
    } else {
      newHidden = [...currentHidden, formId];
    }

    const updatedTheme = {
      ...selectedTheme,
      formConfig: {
        ...selectedTheme.formConfig,
        hiddenFormIds: newHidden,
      },
    };
    setSelectedTheme(updatedTheme);
  };

  const moveFormInOrder = (fromIndex: number, toIndex: number) => {
    if (!selectedTheme || !availableForms.length) return;

    // Get current order or create one from available forms
    let currentOrder = selectedTheme.formConfig?.formOrder || [];
    
    // Ensure all forms are in the order
    const allFormIds = availableForms.map(f => f.id);
    const orderedFormIds = [...currentOrder];
    
    // Add any missing forms to the end
    allFormIds.forEach(formId => {
      if (!orderedFormIds.includes(formId)) {
        orderedFormIds.push(formId);
      }
    });
    
    // Remove any forms that no longer exist
    const validOrderedFormIds = orderedFormIds.filter(id => allFormIds.includes(id));
    
    // Perform the move
    const newOrder = [...validOrderedFormIds];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);

    const updatedTheme = {
      ...selectedTheme,
      formConfig: {
        ...selectedTheme.formConfig,
        formOrder: newOrder,
      },
    };
    
    console.log('↕️ Form order changed');
    console.log('↕️ From index:', fromIndex, 'To index:', toIndex);
    console.log('↕️ New order:', newOrder);
    
    setSelectedTheme(updatedTheme);
  };

  const applyFormConfigOnly = async () => {
    if (!selectedTheme || !config) {
      Alert.alert('Error', 'Theme or device configuration not available');
      return;
    }
    
    console.log('🚀 applyFormConfigOnly - Starting...');
    console.log('🚀 Current selectedTheme:', JSON.stringify(selectedTheme, null, 2));
    console.log('🚀 Current formConfig in selectedTheme:', JSON.stringify(selectedTheme.formConfig, null, 2));

    try {
      // Check if this is the active theme
      if (activeCustomThemeId !== selectedTheme.id) {
        Alert.alert(
          'Apply Form Configuration',
          'This theme is not currently active. Please activate this theme first to apply form configuration changes.'
        );
        return;
      }

      // Built-in themes can now be modified since we have a reset button
      // const builtInThemeIds = ['hightech', 'lawfirm', 'metropolitan', 'zen'];
      // if (builtInThemeIds.includes(selectedTheme.id)) {
      //   Alert.alert(
      //     'Built-in Theme', 
      //     'Built-in themes cannot be modified. Please create a copy of this theme to customize form configuration.'
      //   );
      //   return;
      // }

      setIsLoading(true);
      
      // Update the theme in database with new form config
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      // Create a focused update payload with only formConfig (backend expects partial updates)
      const updatePayload = {
        formConfig: selectedTheme.formConfig,
        updatedAt: new Date().toISOString(),
      };

      console.log('🔧 applyFormConfigOnly - Starting form config save...');
      console.log('🎯 Theme ID:', selectedTheme.id);
      console.log('🎯 Theme name:', selectedTheme.name);
      console.log('🎯 FormConfig being saved:', JSON.stringify(selectedTheme.formConfig, null, 2));
      console.log('🎯 defaultFormIds:', selectedTheme.formConfig?.defaultFormIds);
      console.log('🎯 formOrder:', selectedTheme.formConfig?.formOrder);
      console.log('🎯 hiddenFormIds:', selectedTheme.formConfig?.hiddenFormIds);
      console.log('🔧 Server URL:', config.serverUrl);
      console.log('🔧 Update payload being sent (partial):', JSON.stringify(updatePayload, null, 2));

      const response = await fetch(`${config.serverUrl}/device/themes/${selectedTheme.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        console.log('✅ Theme updated in database successfully, applying locally...');
        console.log('✅ Response status:', response.status);
        
        // Apply the updated theme locally
        const updatedTheme = {
          ...selectedTheme,
          companyId: config.companyId,
          updatedAt: new Date(),
        };
        await applyCustomTheme(updatedTheme, config);
        
        // Refresh the main app's theme context
        await refreshTheme();
        
        // Reload themes to update UI
        await loadAllThemes();
        
        console.log('✅ Form configuration save completed successfully');
        
        Alert.alert(
          'Form Configuration Applied',
          'Your form settings are now active for visitor check-in!'
        );
      } else {
        const errorText = await response.text();
        console.error('❌ Database update failed:', response.status, errorText);
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Fallback: apply locally only
        const updatedTheme = {
          ...selectedTheme,
          companyId: config.companyId,
          updatedAt: new Date(),
        };
        await applyCustomTheme(updatedTheme, config);
        await refreshTheme();
        
        Alert.alert(
          'Applied Locally',
          'Form configuration applied locally. Will sync to database when connection is available.'
        );
      }
    } catch (error) {
      console.error('Error applying form config:', error);
      
      // Try to apply locally as fallback
      try {
        if (selectedTheme && config) {
          const fallbackTheme = {
            ...selectedTheme,
            companyId: config.companyId,
            updatedAt: new Date(),
          };
          
          await applyCustomTheme(fallbackTheme, config);
          await refreshTheme();
          
          Alert.alert(
            'Applied Locally',
            'Form configuration applied locally due to connection error. Will sync when online.'
          );
        } else {
          Alert.alert('Error', 'Failed to apply form configuration');
        }
      } catch (fallbackError) {
        console.error('Fallback apply failed:', fallbackError);
        Alert.alert('Error', 'Failed to apply form configuration');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormEditor = () => {
    if (!selectedTheme) return null;

    const defaultFormIds = selectedTheme.formConfig.defaultFormIds || [];
    const hiddenFormIds = selectedTheme.formConfig.hiddenFormIds || [];
    const formOrder = selectedTheme.formConfig.formOrder || [];
    
    // Create ordered list of forms
    const orderedForms = [...availableForms].sort((a, b) => {
      const aIndex = formOrder.indexOf(a.id);
      const bIndex = formOrder.indexOf(b.id);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return (
      <ScrollView style={styles.editorSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Form Configuration
        </Text>
        
        <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
          Configure which forms are used as defaults for visitor check-in and their display order.
        </Text>

        {loadingForms ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading forms...
            </Text>
          </View>
        ) : availableForms.length === 0 ? (
          <View style={styles.emptyFormsContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No forms available
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Create forms in Form Management to configure them here
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.formConfigHeader}>
              <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>
                Available Forms ({availableForms.length})
              </Text>
              
              <View style={styles.formConfigActions}>
                {activeCustomThemeId === selectedTheme?.id && (
                  <TouchableOpacity
                    style={[styles.applyConfigButton, { backgroundColor: '#10b981' }]}
                    onPress={applyFormConfigOnly}
                    disabled={isLoading}
                  >
                    <Text style={styles.applyConfigText}>
                      {isLoading ? 'Applying...' : '⚡ Apply Now'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Show helpful message for built-in themes */}
                {selectedTheme && ['hightech', 'lawfirm', 'metropolitan', 'zen'].includes(selectedTheme.id) && (
                  <View style={[styles.builtInThemeMessage, { backgroundColor: '#e0f2fe', borderColor: '#0288d1' }]}>
                    <Text style={[styles.builtInThemeText, { color: '#01579b' }]}>
                      💡 You can now configure forms on built-in themes. Use "Reset to Defaults" if you want to restore original settings.
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={[styles.refreshFormsButton, { backgroundColor: theme.colors.primary }]}
                  onPress={loadForms}
                >
                  <Text style={styles.refreshFormsText}>🔄 Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formConfigInfo}>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Active forms</Text> will be used for visitor check-in (limit: 1 for now)
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Form order</Text> determines the sequence shown to visitors
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                • <Text style={{ fontWeight: '600' }}>Hidden forms</Text> won't appear in the visitor interface
              </Text>
            </View>

            {orderedForms.map((form, index) => {
              const isDefault = defaultFormIds.includes(form.id);
              const isHidden = hiddenFormIds.includes(form.id);
              const statusColor = {
                'draft': '#6b7280',
                'active': '#10b981', 
                'inactive': '#f59e0b',
                'archived': '#ef4444'
              }[form.status];

              return (
                <View key={form.id} style={[styles.formConfigItem, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.formItemHeader}>
                    <View style={styles.formItemInfo}>
                      <Text style={[styles.formItemName, { color: theme.colors.text }]}>
                        {form.name}
                      </Text>
                      <View style={styles.formItemMeta}>
                        <View style={[styles.formStatusBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.formStatusText}>{form.status}</Text>
                        </View>
                        <Text style={[styles.formCategoryText, { color: theme.colors.textSecondary }]}>
                          {form.category}
                        </Text>
                        {form.description && (
                          <Text style={[styles.formDescriptionText, { color: theme.colors.textSecondary }]}>
                            {form.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.formItemActions}>
                      <TouchableOpacity
                        style={[
                          styles.formActionButton,
                          { backgroundColor: isDefault ? '#10b981' : theme.colors.primary }
                        ]}
                        onPress={() => {
                          if (isDefault) {
                            toggleFormDefault(form.id);
                          } else {
                            // Only allow one active form for now
                            if (defaultFormIds.length >= 1) {
                              Alert.alert(
                                'One Active Form Only',
                                'Currently only one active form is supported. Please deactivate the current form first.'
                              );
                            } else {
                              toggleFormDefault(form.id);
                            }
                          }
                        }}
                      >
                        <Text style={styles.formActionText}>
                          {isDefault ? '✓ Active' : 'Set Active'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.formActionButton,
                          { backgroundColor: isHidden ? '#ef4444' : '#6b7280' }
                        ]}
                        onPress={() => toggleFormVisibility(form.id)}
                      >
                        <Text style={styles.formActionText}>
                          {isHidden ? '👁️ Hidden' : '👁️ Visible'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.formOrderControls}>
                    <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>
                      Order: #{index + 1}
                    </Text>
                    
                    <View style={styles.orderButtons}>
                      {index > 0 && (
                        <TouchableOpacity
                          style={[styles.orderButton, { backgroundColor: theme.colors.secondary || '#6b7280' }]}
                          onPress={() => moveFormInOrder(index, index - 1)}
                        >
                          <Text style={styles.orderButtonText}>↑</Text>
                        </TouchableOpacity>
                      )}
                      
                      {index < orderedForms.length - 1 && (
                        <TouchableOpacity
                          style={[styles.orderButton, { backgroundColor: theme.colors.secondary || '#6b7280' }]}
                          onPress={() => moveFormInOrder(index, index + 1)}
                        >
                          <Text style={styles.orderButtonText}>↓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {defaultFormIds.length === 0 && (
              <View style={styles.warningContainer}>
                <Text style={[styles.warningText, { color: '#f59e0b' }]}>
                  ⚠️ No active forms selected. The first available form will be used automatically.
                </Text>
              </View>
            )}

            {defaultFormIds.length > 0 && (
              <View style={styles.summaryContainer}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                  Configuration Summary
                </Text>
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  • {defaultFormIds.length} active form{defaultFormIds.length === 1 ? '' : 's'}
                </Text>
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  • {hiddenFormIds.length} hidden form{hiddenFormIds.length === 1 ? '' : 's'}
                </Text>
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  • Primary form: {availableForms.find(f => f.id === defaultFormIds[0])?.name || 'Auto-select first available'}
                </Text>
                
                {activeCustomThemeId === selectedTheme?.id && (
                  <Text style={[styles.summaryText, { color: '#10b981', fontWeight: '600' }]}>
                    💾 Save this theme to apply these form settings to visitor check-in
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderPreviewEditor = () => {
    if (!selectedTheme) return null;

    return (
      <View style={styles.previewSection}>
        <View style={styles.previewHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Live Preview
          </Text>
          <TouchableOpacity
            style={[styles.fullscreenButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowPreview(true)}
          >
            <Text style={styles.fullscreenButtonText}>Fullscreen</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.previewContainer}>
          <ThemePreview theme={selectedTheme} compact={true} />
        </View>
        
        <Text style={[styles.previewDescription, { color: theme.colors.textSecondary }]}>
          This shows how your theme will appear to visitors. Click fullscreen for a detailed preview.
        </Text>
      </View>
    );
  };

  const renderThemeEditor = () => {
    if (!selectedTheme) return null;

    const tabs = [
      { key: 'colors', label: 'Colors', icon: '🎨' },
      { key: 'fonts', label: 'Fonts', icon: '✒️' },
      { key: 'images', label: 'Images', icon: '🖼️' },
      { key: 'layout', label: 'Layout', icon: '📐' },
      { key: 'forms', label: 'Forms', icon: '📝' },
      { key: 'preview', label: 'Preview', icon: '👁️' },
    ];

    return (
      <Modal
        visible={showEditor}
        animationType="slide"
        onRequestClose={() => {
          if (!isSaving) {
            setShowEditor(false);
          }
        }}
      >
        <View style={[styles.editorContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.editorHeader, { backgroundColor: theme.colors.primary }]}>
            <TouchableOpacity 
              onPress={() => {
                if (!isSaving) {
                  setShowEditor(false);
                }
              }} 
              style={styles.closeButton}
              disabled={isSaving}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.editorTitle}>Edit Theme</Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => selectedTheme && exportTheme(selectedTheme)}
                style={[styles.headerActionButton, { marginRight: 8 }]}
              >
                <Text style={styles.headerActionText}>Export</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => saveTheme(selectedTheme)}
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.themeNameContainer}>
            <TextInput
              style={[styles.themeNameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={selectedTheme.name}
              onChangeText={(value) => {
                setSelectedTheme({ ...selectedTheme, name: value });
              }}
              placeholder="Theme Name"
              placeholderTextColor={theme.colors.textSecondary}
            />
            
            {activeCustomThemeId === selectedTheme.id && (
              <View style={styles.activeThemeNotice}>
                <Text style={[styles.activeThemeText, { color: '#10b981' }]}>
                  ⚡ This is your active theme. Save to apply form configuration changes immediately.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    activeTab === tab.key && { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === tab.key ? 'white' : theme.colors.text }
                  ]}>
                    {tab.icon} {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {activeTab === 'colors' && renderColorEditor()}
          {activeTab === 'fonts' && renderFontEditor()}
          {activeTab === 'images' && renderImageEditor()}
          {activeTab === 'layout' && renderLayoutEditor()}
          {activeTab === 'forms' && renderFormEditor()}
          {activeTab === 'preview' && renderPreviewEditor()}
        </View>
      </Modal>
    );
  };

  const renderPresetPicker = () => {
    return (
      <Modal
        visible={showPresetPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPresetPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.presetModalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.modalTitle}>Choose a Preset</Text>
              <TouchableOpacity
                onPress={() => setShowPresetPicker(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.presetList}>
              {THEME_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetItem, { backgroundColor: theme.colors.surface }]}
                  onPress={() => createNewTheme(preset)}
                >
                  <Text style={styles.presetIcon}>{preset.thumbnail}</Text>
                  <View style={styles.presetInfo}>
                    <Text style={[styles.presetName, { color: theme.colors.text }]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.presetDescription, { color: theme.colors.textSecondary }]}>
                      {preset.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[styles.presetItem, { backgroundColor: theme.colors.surface }]}
                onPress={() => createNewTheme()}
              >
                <Text style={styles.presetIcon}>➕</Text>
                <View style={styles.presetInfo}>
                  <Text style={[styles.presetName, { color: theme.colors.text }]}>
                    Blank Theme
                  </Text>
                  <Text style={[styles.presetDescription, { color: theme.colors.textSecondary }]}>
                    Start from scratch
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading themes...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Theme Management</Text>
          {config?.companyName && (
            <Text style={styles.companySubtitle}>{config.companyName}</Text>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowPresetPicker(true)}
          >
            <Text style={styles.createButtonText}>+ Create Custom Theme</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.colors.secondary || '#6b7280' }]}
            onPress={loadAllThemes}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#ef4444' }]}
            onPress={cleanupDuplicateThemes}
          >
            <Text style={styles.refreshButtonText}>🔄 Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
        
        {themes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No themes found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Built-in themes will be loaded automatically
            </Text>
            <TouchableOpacity
              style={[styles.restoreButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
              onPress={restoreBuiltInThemes}
            >
              <Text style={styles.restoreButtonText}>🔄 Restore Built-in Themes</Text>
            </TouchableOpacity>
          </View>
        ) : themes.length < 4 ? (
          <View>
            <View style={styles.themeGrid}>
              {themes.map(renderThemeCard)}
            </View>
            <TouchableOpacity
              style={[styles.restoreButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
              onPress={restoreBuiltInThemes}
            >
              <Text style={styles.restoreButtonText}>🔄 Restore Missing Built-in Themes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.themeGrid}>
            {themes.map(renderThemeCard)}
          </View>
        )}
      </ScrollView>
      
      {renderThemeEditor()}
      {renderPresetPicker()}
      
      {/* Fullscreen Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={[styles.previewModalHeader, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.previewModalTitle}>Theme Preview</Text>
            <TouchableOpacity
              onPress={() => setShowPreview(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedTheme && <ThemePreview theme={selectedTheme} />}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  companySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  createButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  themeGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
  },
  themeCard: {
    width: isTablet ? '48%' : '100%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  themePreview: {
    flexDirection: 'row',
    height: 80,
  },
  colorSwatch: {
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeIndicatorText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  themeInfo: {
    padding: 16,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  themeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  themeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 12,
  },
  themeActions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 6,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallActionButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  smallActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Editor styles
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  editorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: 'white',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  themeNameContainer: {
    padding: 16,
  },
  themeNameInput: {
    fontSize: 24,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  activeThemeNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  activeThemeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editorSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  // Color editor
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colorLabel: {
    fontSize: 14,
    flex: 1,
    textTransform: 'capitalize',
  },
  colorInputContainer: {
    flex: 1,
    marginLeft: 8,
  },
  // Form controls
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Image editor
  imageUploadButton: {
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  uploadText: {
    fontSize: 14,
  },
  imageContainer: {
    marginBottom: 24,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  deleteImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Form editor
  formListPlaceholder: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyFormsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  formConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formConfigActions: {
    flexDirection: 'row',
    gap: 8,
  },
  applyConfigButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  applyConfigText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshFormsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshFormsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  formConfigInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  formConfigItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  formItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  formItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  formItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  formStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  formStatusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  formCategoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formDescriptionText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  formItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  formActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  formActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  formOrderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  orderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  // Preset picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  presetList: {
    padding: 16,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  presetIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 14,
  },
  // Preview styles
  previewSection: {
    flex: 1,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullscreenButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fullscreenButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    height: 200,
    marginBottom: 12,
  },
  previewDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  previewModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  builtInThemeMessage: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  builtInThemeText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  copyThemeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyThemeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  restoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ThemeManagementScreen;