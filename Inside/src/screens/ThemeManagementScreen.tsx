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
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyCustomTheme, clearCustomTheme, getActiveCustomTheme } from '../utils/customThemeUtils';
import ColorPicker from '../components/ColorPicker';
import ThemePreview from '../components/ThemePreview';
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

  // Theme emoji mapping
  const themeEmojis: Record<string, string> = {
    'hightech': '🚀',
    'lawfirm': '⚖️', 
    'metropolitan': '🏙️',
    'zen': '🧘'
  };

  useEffect(() => {
    loadAllThemes();
  }, []);

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
        return allThemes.map((theme: any) => ({
          ...theme,
          createdAt: new Date(theme.createdAt),
          updatedAt: new Date(theme.updatedAt),
        }));
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

    try {
      // Check if this is a built-in theme (cannot be saved/modified)
      const builtInThemeIds = ['hightech', 'lawfirm', 'metropolitan', 'zen'];
      if (builtInThemeIds.includes(theme.id)) {
        Alert.alert('Built-in Theme', 'Built-in themes cannot be modified. Please create a copy to customize.');
        return;
      }

      // Update theme with company info and timestamp
      const updatedTheme = {
        ...theme,
        companyId: config.companyId,
        updatedAt: new Date(),
        createdAt: theme.createdAt || new Date(),
      };

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      // Check if theme exists by trying to load existing themes
      const existingThemes = await loadCustomThemes();
      const existingTheme = existingThemes.find(t => t.id === theme.id);
      
      const isNew = !existingTheme;
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
        
        Alert.alert('Success', `Theme ${isNew ? 'created' : 'updated'} successfully`);
        setShowEditor(false);
      } else {
        const errorData = await response.text();
        console.error('Database save failed:', response.status, errorData);
        
        // Fallback to local storage
        await saveThemeLocally(updatedTheme);
        Alert.alert('Saved Locally', 'Theme saved to device. Will sync to database when connection is available.');
        setShowEditor(false);
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
        Alert.alert('Saved Locally', 'Theme saved to device. Will sync to database when connection is available.');
        setShowEditor(false);
      } catch (localError) {
        Alert.alert('Error', 'Failed to save theme');
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

  const pickImage = async (type: keyof ThemeImages) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 1,
    });

    if (!result.canceled && selectedTheme) {
      const updatedTheme = {
        ...selectedTheme,
        images: {
          ...selectedTheme.images,
          [type]: result.assets[0].uri,
        },
      };
      setSelectedTheme(updatedTheme);
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
              {theme.name}
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
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Primary Font</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={selectedTheme.fonts.primary}
            onChangeText={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                fonts: {
                  ...selectedTheme.fonts,
                  primary: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            placeholder="System"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Heading Font</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={selectedTheme.fonts.heading}
            onChangeText={(value) => {
              const updatedTheme = {
                ...selectedTheme,
                fonts: {
                  ...selectedTheme.fonts,
                  heading: value,
                },
              };
              setSelectedTheme(updatedTheme);
            }}
            placeholder="System"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

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
        
        <TouchableOpacity
          style={[styles.imageUploadButton, { borderColor: theme.colors.border }]}
          onPress={() => pickImage('logo')}
        >
          {selectedTheme.images.logo ? (
            <Image source={{ uri: selectedTheme.images.logo }} style={styles.imagePreview} />
          ) : (
            <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
              Upload Logo
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.imageUploadButton, { borderColor: theme.colors.border }]}
          onPress={() => pickImage('background')}
        >
          {selectedTheme.images.background ? (
            <Image source={{ uri: selectedTheme.images.background }} style={styles.imagePreview} />
          ) : (
            <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
              Upload Background
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.imageUploadButton, { borderColor: theme.colors.border }]}
          onPress={() => pickImage('welcomeImage')}
        >
          {selectedTheme.images.welcomeImage ? (
            <Image source={{ uri: selectedTheme.images.welcomeImage }} style={styles.imagePreview} />
          ) : (
            <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
              Upload Welcome Image
            </Text>
          )}
        </TouchableOpacity>
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

  const renderFormEditor = () => {
    if (!selectedTheme) return null;

    return (
      <ScrollView style={styles.editorSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Form Configuration
        </Text>
        
        <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
          Configure which forms are shown with this theme and their display order.
        </Text>

        <View style={styles.formListPlaceholder}>
          <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
            Form selection will be available after forms are loaded
          </Text>
        </View>
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
        onRequestClose={() => setShowEditor(false)}
      >
        <View style={[styles.editorContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.editorHeader, { backgroundColor: theme.colors.primary }]}>
            <TouchableOpacity onPress={() => setShowEditor(false)} style={styles.closeButton}>
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
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
        </View>
        
        {themes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Loading themes...
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Please wait while we load the available themes
            </Text>
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
});

export default ThemeManagementScreen;