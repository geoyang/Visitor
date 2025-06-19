import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSignInAlt, faBox, faSignOutAlt, faCog, faEdit, faPalette, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';
import { useTheme, EnhancedThemeProvider } from '../contexts/EnhancedThemeContext';
import { ThemeType } from '../themes/themes';
import { CustomForm, FormField } from '../types/formBuilder';
import ThemeBackground from './ThemeBackground';
import WorkflowManagementScreen from '../screens/WorkflowManagementScreen';
import FormManagementScreen from '../screens/FormManagementScreen';
import ThemeManagementScreen from '../screens/ThemeManagementScreen';
import { validateFormSubmission, isFormValid, getFirstValidationError, validateNumber, validatePhone, formatPhoneNumber } from '../utils/validationUtils';

const Tab = createBottomTabNavigator();

// Helper function to get Font Awesome icon for each welcome screen option
const getIconForImageName = (imageName: string) => {
  switch (imageName) {
    case 'Check In':
      return faSignInAlt;
    case 'Delivery':
      return faBox;
    case 'Check Out':
      return faSignOutAlt;
    default:
      return faSignInAlt;
  }
};

// Get device dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768; // iPad and larger tablets
const isLargeTablet = screenWidth >= 1024; // iPad Pro and larger

// Responsive helper functions
const responsiveWidth = (percentage: number) => {
  if (isLargeTablet) {
    // On large tablets, limit max width for better UX
    return Math.min(screenWidth * (percentage / 100), screenWidth * 0.6);
  }
  return screenWidth * (percentage / 100);
};

const responsiveFontSize = (size: number) => {
  if (isLargeTablet) return size * 1.3;
  if (isTablet) return size * 1.1;
  return size;
};

const responsivePadding = (size: number) => {
  if (isLargeTablet) return size * 1.5;
  if (isTablet) return size * 1.2;
  return size;
};

// Welcome Screen with Image Selection
function WelcomeScreen({ onStartCheckIn, onStartCheckOut, onOpenSettings }: { 
  onStartCheckIn: () => void;
  onStartCheckOut?: () => void;
  onOpenSettings?: () => void;
}) {
  const { config } = useSimpleDeviceConfig();
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (onOpenSettings) {
      // Start a subtle pulse animation for the settings icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulseAnim, onOpenSettings]);

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    // Update immediately
    updateTime();

    // Set up interval to update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleImageSelect = (imageName: string) => {
    if (imageName === 'Check Out' && onStartCheckOut) {
      onStartCheckOut();
    } else {
      onStartCheckIn();
    }
  };

  const handleSettingsPress = () => {
    console.log('Settings icon pressed!', { onOpenSettings: !!onOpenSettings });
    console.log('onOpenSettings function:', onOpenSettings);
    if (onOpenSettings) {
      console.log('Calling onOpenSettings...');
      onOpenSettings();
    } else {
      console.log('onOpenSettings is not available');
      Alert.alert('Debug', 'Settings icon clicked but onOpenSettings is not available');
    }
  };

  const dynamicStyles = createDynamicStyles(theme);

  return (
    <ThemeBackground theme={theme} style={{ flex: 1 }}>
      {/* Settings Icon - Always show for debugging */}
      <TouchableOpacity 
        style={styles.settingsIcon} 
        onPress={handleSettingsPress}
        activeOpacity={0.7}
      >
        <FontAwesomeIcon icon={faCog} size={30} color="white" />
      </TouchableOpacity>
      
      <View style={styles.welcomeContent}>
        {/* Welcome Message */}
        <View style={styles.welcomeMessageContainer}>
          <Text style={[
            dynamicStyles.welcomeTitle, 
            { 
              fontFamily: theme.fonts.primary,
              fontWeight: theme.fonts.weights.bold,
              color: 'white'
            }
          ]}>
            Welcome to {config?.companyName || 'Our Company'}
          </Text>
          {config?.locationName && (
            <Text style={[
              dynamicStyles.welcomeSubtitle,
              {
                fontFamily: theme.fonts.secondary,
                fontWeight: theme.fonts.weights.regular,
                color: 'rgba(255, 255, 255, 0.9)'
              }
            ]}>
              {config.locationName}
            </Text>
          )}
        </View>

        {/* Welcome Cards */}
        <View style={styles.welcomeCardsContainer}>
          <View style={styles.imageGrid}>
            {theme.welcomeImages.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={[
                  dynamicStyles.imageCard, 
                  { backgroundColor: image.color },
                  theme.shadow.medium
                ]}
                onPress={() => handleImageSelect(image.name)}
                activeOpacity={0.8}
              >
                <View style={dynamicStyles.iconContainer}>
                  <FontAwesomeIcon 
                    icon={getIconForImageName(image.name)} 
                    size={dynamicStyles.imageEmoji.fontSize * 0.6}
                    color="white"
                  />
                </View>
                <Text style={[
                  dynamicStyles.imageName,
                  { 
                    fontFamily: theme.fonts.primary,
                    fontWeight: theme.fonts.weights.bold
                  }
                ]}>{image.name}</Text>
                <Text style={[
                  dynamicStyles.imageDescription,
                  { 
                    fontFamily: theme.fonts.secondary,
                    fontWeight: theme.fonts.weights.regular
                  }
                ]}>{image.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Digital Clock */}
        <View style={styles.clockContainer}>
          <Text style={[
            dynamicStyles.clockTime,
            {
              fontFamily: theme.fonts.primary,
              fontWeight: theme.fonts.weights.bold,
              color: 'white'
            }
          ]}>
            {formatTime(currentTime)}
          </Text>
          <Text style={[
            dynamicStyles.clockDate,
            {
              fontFamily: theme.fonts.secondary,
              fontWeight: theme.fonts.weights.regular,
              color: 'rgba(255, 255, 255, 0.9)'
            }
          ]}>
            {formatDate(currentTime)}
          </Text>
        </View>
      </View>
    </ThemeBackground>
  );
}

// Simple Visitor Check-in Screen
function CheckInScreen({ onBackToWelcome }: { onBackToWelcome?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [defaultFormId, setDefaultFormId] = useState<string>('');
  const [lastThemeCheck, setLastThemeCheck] = useState<number>(0);
  const [currentForm, setCurrentForm] = useState<CustomForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loadingForm, setLoadingForm] = useState(true); // Start with loading true
  const [allForms, setAllForms] = useState<CustomForm[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});
  const { config } = useSimpleDeviceConfig();
  const { theme } = useTheme();

  // Debug theme fonts (simplified to avoid loops)
  useEffect(() => {
    console.log('🎨 CheckInScreen theme fonts:', {
      primary: theme.fonts?.primary,
      heading: theme.fonts?.heading, 
      button: theme.fonts?.button,
      body: theme.fonts?.body
    });
  }, [theme]);

  // Debug state changes
  useEffect(() => {
    console.log('🐛 allForms state changed, length:', allForms.length);
    console.log('🐛 allForms IDs:', allForms.map(f => f.id));
  }, [allForms]);

  useEffect(() => {
    console.log('🐛 defaultFormId state changed:', defaultFormId);
  }, [defaultFormId]);

  useEffect(() => {
    console.log('🐛 currentForm state changed:', currentForm?.name, 'ID:', currentForm?.id);
  }, [currentForm]);
  
  // Workflow execution hook would be added here in production
  // const { executeWorkflowsForTrigger } = useWorkflowExecution();

  // Load the default form ID from the active theme configuration
  useEffect(() => {
    console.log('🚀 CheckInScreen mounted, loading theme form config...');
    const loadInitialForm = async () => {
      setLoadingForm(true);
      await loadDefaultFormFromTheme();
      setInitialLoadComplete(true);
      setLoadingForm(false);
    };
    
    loadInitialForm();
  }, [config]);

  // Refresh form config when theme changes (check every 30 seconds)
  // Only start the interval after initial load is complete
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    const interval = setInterval(() => {
      console.log('🔄 30s interval: refreshing form config...');
      loadDefaultFormFromTheme();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [config, initialLoadComplete]);

  // Also refresh when the screen gains focus
  // Only refresh on focus after initial load is complete
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    const handleFocus = () => {
      console.log('🔄 Focus event: refreshing form config...');
      loadDefaultFormFromTheme();
    };

    // Set up focus listener (simplified version)
    const focusTimer = setTimeout(handleFocus, 100);
    
    return () => clearTimeout(focusTimer);
  }, [initialLoadComplete]);

  const loadDefaultFormFromTheme = async () => {
    if (!config) return;

    try {
      console.log('🔄 Loading form configuration from active theme...');
      
      // Import the theme utility to get the active theme with formConfig
      const { getActiveCustomTheme } = await import('../utils/customThemeUtils');
      
      // Get the active theme configuration which now includes formConfig
      const activeThemeActivation = await getActiveCustomTheme(config);
      const currentTime = Date.now();
      
      console.log('🔍 Active theme activation:', JSON.stringify(activeThemeActivation, null, 2));
      console.log('🔍 Has active theme:', activeThemeActivation.isActive);
      console.log('🔍 Theme object:', activeThemeActivation.theme);
      console.log('🔍 Theme images:', activeThemeActivation.theme?.images);
      console.log('🔍 Form config from theme:', JSON.stringify(activeThemeActivation.formConfig, null, 2));
        
        if (activeThemeActivation && activeThemeActivation.isActive && activeThemeActivation.formConfig) {
          const formConfig = activeThemeActivation.formConfig;
          console.log('🎨 Active theme data:', {
            themeId: activeThemeActivation.originalThemeId,
            isActive: activeThemeActivation.isActive,
            formConfig: formConfig
          });
          
          // Check for active forms in the theme configuration
          let configuredFormId = null;
          
          if (formConfig && formConfig.defaultFormIds && formConfig.defaultFormIds.length > 0) {
            configuredFormId = formConfig.defaultFormIds[0];
            console.log('🎯 Theme specifies form ID (defaultFormIds):', configuredFormId);
            console.log('🎯 All default form IDs:', formConfig.defaultFormIds);
          } else if (formConfig && formConfig.activeForms && formConfig.activeForms.length > 0) {
            configuredFormId = formConfig.activeForms[0];
            console.log('🎯 Theme specifies form ID (activeForms):', configuredFormId);
            console.log('🎯 All active form IDs:', formConfig.activeForms);
          } else if (formConfig && formConfig.formOrder && formConfig.formOrder.length > 0) {
            configuredFormId = formConfig.formOrder[0];
            console.log('🎯 Theme specifies form ID (formOrder):', configuredFormId);
            console.log('🎯 All ordered form IDs:', formConfig.formOrder);
          } else {
            console.log('🎯 No configured forms found in theme, checking for any form configuration...');
            console.log('🎯 Available formConfig keys:', Object.keys(formConfig || {}));
            console.log('🎯 Full formConfig contents:', JSON.stringify(formConfig, null, 2));
          }
          
          if (configuredFormId) {
            console.log('🎯 Will load configured form:', configuredFormId);
            
            // ALWAYS load forms first to ensure we have the cache populated
            // Force refresh to get the latest form updates
            const loadedForms = await loadAllFormsFirst(true);
            
            console.log('🔍 Looking for configured form:', configuredFormId);
            console.log('🔍 Loaded forms count:', loadedForms.length);
            console.log('🔍 Available form IDs:', loadedForms.map(f => f.id));
            
            // Check if the configured form exists in the loaded forms
            const targetForm = loadedForms.find(form => form.id === configuredFormId);
            
            if (targetForm) {
              const formIdToUse = getFormId(targetForm);
              console.log('✅ Found configured form:', targetForm.name, '→ Using form ID:', formIdToUse);
              
              // FORCE the form to be set to the configured one, regardless of current state
              console.log('🎯 FORCING form selection to configured form:', formIdToUse);
              setDefaultFormId(formIdToUse);
              loadFormStructureDirectly(targetForm);
              console.log('✅ Theme-configured form loaded successfully');
              
            } else {
              console.log('⚠️ Configured form not found after load!');
              console.log('⚠️ Configured form ID:', configuredFormId);
              console.log('⚠️ Available form IDs:', loadedForms.map(f => f.id));
              console.log('⚠️ Available form names:', loadedForms.map(f => f.name));
              console.log('⚠️ Will force a fresh API call...');
              
              // Force a complete reload directly from API
              setAllForms([]);
              const freshForms = await loadFirstAvailableForm(true);
              
              // Try one more time with fresh forms
              const targetFormAfterReload = freshForms.find(form => form.id === configuredFormId);
              
              if (targetFormAfterReload) {
                const formIdToUse = getFormId(targetFormAfterReload);
                console.log('✅ Found configured form after fresh reload:', targetFormAfterReload.name);
                setDefaultFormId(formIdToUse);
                loadFormStructureDirectly(targetFormAfterReload);
              } else {
                console.log('❌ STILL cannot find configured form. Theme config may be stale. Loading first form.');
                await loadFirstAvailableForm();
              }
            }
          } else {
            console.log('⚠️ No active forms configured in theme');
            console.log('⚠️ Full theme activation data:', JSON.stringify(activeThemeActivation, null, 2));
            console.log('⚠️ Loading first available form as fallback');
            await loadFirstAvailableForm();
          }
        } else {
          console.log('⚠️ No active theme or formConfig missing');
          console.log('⚠️ activeThemeActivation:', activeThemeActivation);
          console.log('⚠️ isActive:', activeThemeActivation?.isActive);
          console.log('⚠️ has formConfig:', !!activeThemeActivation?.formConfig);
          console.log('⚠️ Loading first available form as fallback');
          await loadFirstAvailableForm();
        }
        
        setLastThemeCheck(currentTime);
    } catch (error) {
      console.error('❌ Error loading theme form configuration:', error);
      await loadFirstAvailableForm();
    }
  };

  // Form ID helper - use the server-generated form ID
  const getFormId = (form: any) => {
    return form.id;
  };

  const loadAllFormsFirst = async (forceRefresh = false) => {
    // If forms are already loaded and not forcing refresh, don't reload
    if (allForms.length > 0 && !forceRefresh) {
      console.log('📋 Forms already cached, using existing data');
      return allForms;
    }
    
    if (forceRefresh) {
      console.log('📋 Force refreshing forms cache...');
      setAllForms([]); // Clear cache
    } else {
      console.log('📋 Loading forms to cache...');
    }
    
    // Load forms without setting default form - just cache them
    const loadedForms = await loadFirstAvailableForm(true);
    return loadedForms || [];
  };

  const loadFirstAvailableForm = async (skipFormSelection = false) => {
    if (!config) {
      console.error('❌ Config not available in loadFirstAvailableForm');
      return [];
    }

    try {
      console.log('🔍 Loading first available form for company...', skipFormSelection ? '(cache only)' : '');
      console.log('🔧 Using server URL:', config.serverUrl);
      console.log('🔧 Device token available:', !!config.deviceToken);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
        console.log('✅ [Forms API] Device token included');
      } else {
        console.log('⚠️ [Forms API] No device token');
      }

      console.log('🌐 Making request to:', `${config.serverUrl}/forms`);
      const response = await fetch(`${config.serverUrl}/forms`, {
        method: 'GET',
        headers,
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const forms = await response.json();
        console.log('📋 Forms received:', forms?.length || 0, 'forms');
        console.log('📋 Forms data:', JSON.stringify(forms, null, 2));
        
        // Use forms exactly as they come from the server
        const formsWithDates = forms.map((form: any) => {
          console.log('📋 Processing form from API:', {
            id: form.id,
            name: form.name,
            fieldsCount: form.fields?.length || 0
          });
          
          return {
            ...form,
            createdAt: new Date(form.createdAt),
            updatedAt: new Date(form.updatedAt),
          };
        });
        setAllForms(formsWithDates);
        
        if (forms && forms.length > 0 && !skipFormSelection) {
          const firstForm = forms[0];
          const firstFormWithDates = formsWithDates[0];
          
          // Use the original form ID from the server
          const formIdToUse = getFormId(firstFormWithDates);
          
          console.log('🎆 Using first available form:', firstForm.name, 'with ID:', formIdToUse);
          console.log('🔍 Form ID details:', {
            originalId: firstForm.id,
            formIdToUse: formIdToUse,
            type: typeof formIdToUse,
            length: formIdToUse?.length
          });
          setDefaultFormId(formIdToUse);
          // Load form structure immediately since we have the form data
          loadFormStructureDirectly(firstFormWithDates);
        } else if (skipFormSelection) {
          console.log('📋 Forms cached without selecting default form');
        } else {
          console.log('⚠️ No forms available for this company');
          Alert.alert('No Forms Available', 'Please create forms in Form Management before using check-in.');
        }
        
        // Return the loaded forms so caller can use them immediately
        return formsWithDates;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load forms:', response.status, errorText);
        Alert.alert('Error', `Unable to load forms (${response.status}). Please check your connection.`);
      }
    } catch (error) {
      console.error('❌ Error loading first available form:', error);
      console.error('❌ Error details:', error.message, error.stack);
      Alert.alert('Error', `Unable to load forms: ${error.message}`);
    }
    
    return [];
  };

  const loadFormStructureDirectly = (form: CustomForm) => {
    try {
      setLoadingForm(true);
      console.log('🔧 Loading form structure directly:', form.name, 'with', form.fields?.length || 0, 'fields');
      
      if (!form.fields || !Array.isArray(form.fields)) {
        console.error('❌ Form has no fields or fields is not an array:', form.fields);
        Alert.alert('Error', 'Form structure is invalid - no fields found.');
        return;
      }
      
      setCurrentForm(form);
      
      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      form.fields?.forEach((field: FormField) => {
        initialData[field.id] = field.defaultValue || '';
        console.log('🔧 Initialized field:', field.id, 'with value:', field.defaultValue || '');
      });
      setFormData(initialData);
      console.log('✅ Form structure loaded successfully (direct)');
      
    } catch (error) {
      console.error('❌ Error loading form structure directly:', error);
      Alert.alert('Error', `Unable to load form structure: ${error.message}`);
    } finally {
      setLoadingForm(false);
    }
  };

  const loadFormStructure = (formId: string) => {
    if (!formId) {
      console.error('❌ Missing formId in loadFormStructure:', formId);
      return;
    }

    try {
      setLoadingForm(true);
      console.log('🔧 Loading form structure for:', formId);
      console.log('🔧 Looking in cached forms:', allForms.length, 'forms available');

      // Find form in cached forms by server ID
      let form = allForms.find(f => f.id === formId);
      
      if (!form) {
        console.error('❌ Form not found in cache:', formId);
        console.log('📋 Available form IDs:', allForms.map(f => ({ id: f.id, name: f.name })));
        
        // If form not found in cache, try to reload all forms first
        if (allForms.length === 0) {
          console.log('🔄 No cached forms, reloading all forms...');
          setLoadingForm(false); // Clear loading state before reloading
          loadFirstAvailableForm();
          return;
        }
        
        // As a fallback, check if we have the form data passed to us directly
        // This handles the case where loadFormStructure is called immediately after caching
        console.log('🔄 Trying to find form in recently loaded data...');
        
        Alert.alert('Error', `Form ${formId} not found. Please refresh and try again.`);
        return;
      }

      console.log('📋 Found form in cache:', form.name, 'with', form.fields?.length || 0, 'fields');
      
      if (!form.fields || !Array.isArray(form.fields)) {
        console.error('❌ Form has no fields or fields is not an array:', form.fields);
        Alert.alert('Error', 'Form structure is invalid - no fields found.');
        return;
      }
      
      setCurrentForm(form);
      
      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      form.fields?.forEach((field: FormField) => {
        initialData[field.id] = field.defaultValue || '';
        console.log('🔧 Initialized field:', field.id, 'with value:', field.defaultValue || '');
      });
      setFormData(initialData);
      console.log('✅ Form structure loaded successfully from cache');
      
    } catch (error) {
      console.error('❌ Error loading form structure:', error);
      Alert.alert('Error', `Unable to load form structure: ${error.message}`);
    } finally {
      setLoadingForm(false);
    }
  };

  const updateFormField = (fieldId: string, value: any) => {
    // Handle phone number formatting
    if (currentForm) {
      const field = currentForm.fields.find(f => f.id === fieldId);
      if (field && field.type === 'phone') {
        // Format phone number as user types
        value = formatPhoneNumber(value);
      }
    }

    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Real-time validation for email, number, and phone fields
    if (currentForm) {
      const field = currentForm.fields.find(f => f.id === fieldId);
      if (field && (field.type === 'email' || field.type === 'number' || field.type === 'phone')) {
        const { validateEmail, validateNumber, validatePhone } = require('../utils/validationUtils');
        let validationResult;
        
        if (field.type === 'email') {
          validationResult = validateEmail(value);
        } else if (field.type === 'number') {
          validationResult = validateNumber(value);
        } else if (field.type === 'phone') {
          validationResult = validatePhone(value);
        }
        
        setFieldValidationErrors(prev => ({
          ...prev,
          [fieldId]: validationResult.isValid ? '' : (validationResult.message || '')
        }));
      } else {
        // Clear validation error for fields without validation
        setFieldValidationErrors(prev => ({
          ...prev,
          [fieldId]: ''
        }));
      }
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id] || '';
    const validationError = fieldValidationErrors[field.id];
    const hasError = validationError && validationError.length > 0;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: theme.fonts.primary, color: theme.colors.text }]}>
              {field.label} {field.required && '*'}
            </Text>
            <TextInput
              style={[
                styles.input,
                hasError && { borderColor: theme.colors.error, borderWidth: 1 }
              ]}
              value={value}
              onChangeText={(text) => updateFormField(field.id, text)}
              placeholder={field.placeholder || field.label}
              keyboardType={
                field.type === 'email' ? 'email-address' : 
                field.type === 'phone' ? 'phone-pad' : 
                field.type === 'number' ? 'numeric' : 
                'default'
              }
            />
            {hasError && (
              <Text style={[styles.errorText, { fontFamily: theme.fonts.body, color: theme.colors.error }]}>
                {validationError}
              </Text>
            )}
            {field.helpText && !hasError && (
              <Text style={[styles.helpText, { fontFamily: theme.fonts.body, color: theme.colors.textSecondary }]}>
                {field.helpText}
              </Text>
            )}
          </View>
        );
      
      case 'textarea':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: theme.fonts.primary, color: theme.colors.text }]}>
              {field.label} {field.required && '*'}
            </Text>
            <TextInput
              style={[styles.input, { minHeight: (field.rows || 3) * 20 }]}
              value={value}
              onChangeText={(text) => updateFormField(field.id, text)}
              placeholder={field.placeholder || field.label}
              multiline
              numberOfLines={field.rows || 3}
            />
            {field.helpText && (
              <Text style={[styles.helpText, { fontFamily: theme.fonts.body, color: theme.colors.textSecondary }]}>
                {field.helpText}
              </Text>
            )}
          </View>
        );
      
      case 'select':
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: theme.fonts.primary, color: theme.colors.text }]}>
              {field.label} {field.required && '*'}
            </Text>
            <View style={styles.selectContainer}>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.selectOption,
                    { 
                      backgroundColor: value === option.value ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border 
                    }
                  ]}
                  onPress={() => updateFormField(field.id, option.value)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    { color: value === option.value ? 'white' : theme.colors.text }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {field.helpText && (
              <Text style={[styles.helpText, { fontFamily: theme.fonts.body, color: theme.colors.textSecondary }]}>
                {field.helpText}
              </Text>
            )}
          </View>
        );
      
      default:
        return (
          <View key={field.id} style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {field.label} ({field.type} - not yet supported)
            </Text>
          </View>
        );
    }
  };

  const clearForm = () => {
    if (currentForm) {
      // Clear form data
      const clearedData: Record<string, any> = {};
      currentForm.fields?.forEach((field: FormField) => {
        clearedData[field.id] = field.defaultValue || '';
      });
      setFormData(clearedData);
    }
  };

  const handleCheckIn = async () => {
    if (!config) {
      Alert.alert('Error', 'Device not configured');
      return;
    }
    
    console.log('🔧 Device configuration:', {
      deviceId: config.deviceId,
      locationId: config.locationId,
      companyId: config.companyId,
      deviceName: config.deviceName,
      companyName: config.companyName,
      locationName: config.locationName,
      deviceToken: config.deviceToken ? 'Present' : 'Missing',
      serverUrl: config.serverUrl,
      tokenLength: config.deviceToken?.length,
      tokenSample: config.deviceToken ? config.deviceToken.substring(0, 20) + '...' : 'None',
      configKeys: Object.keys(config)
    });

    if (!currentForm || !defaultFormId) {
      Alert.alert('Error', 'No form loaded. Please try refreshing.');
      return;
    }

    console.log('📋 Using form ID for submission:', defaultFormId);

    // Validate form data using validation utilities
    const validationResults = validateFormSubmission(formData, currentForm.fields);
    
    if (!isFormValid(validationResults)) {
      const firstError = getFirstValidationError(validationResults);
      Alert.alert('Validation Error', firstError || 'Please check your form data');
      return;
    }

    // Legacy validation check for backwards compatibility
    const requiredFields = currentForm.fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => {
      const value = formData[field.id];
      return !value || String(value).trim() === '';
    });
    
    if (missingFields.length > 0) {
      Alert.alert('Error', `Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      // Use form data with device/location info
      const submissionData = {
        ...formData,
        device_id: config.deviceId,
        location_id: config.locationId,
        company_id: config.companyId,
      };
      
      // Use the server form ID directly
      const formIdToUse = currentForm.id;
      
      console.log('🔍 Using server form ID:', {
        formId: currentForm.id,
        formIdToUse: formIdToUse,
        formName: currentForm.name
      });
      
      // Include form information in the data for reference
      const enhancedSubmissionData = {
        ...submissionData,
        _form_name: currentForm.name // Store form name for reference
      };
      
      const visitorData = {
        form_id: formIdToUse, // Using original form ID from database
        location_id: config.locationId,
        data: enhancedSubmissionData,
        check_in_time: new Date().toISOString(),
        status: "checked_in"
      };
      
      console.log('✅ Using server form ID for visitor submission:', formIdToUse);
      console.log('🔍 Form ID validation:', {
        defaultFormId: defaultFormId,
        currentFormId: currentForm.id,
        formIdToUse: formIdToUse,
        areTheyEqual: formIdToUse === defaultFormId
      });

      console.log('🚀 Submitting visitor data:', JSON.stringify(visitorData, null, 2));
      console.log('🔍 Form ID being sent:', defaultFormId, 'Type:', typeof defaultFormId, 'Length:', defaultFormId?.length);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add device token if available
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
        console.log('✅ Device token included in headers');
        console.log('🔐 Device token details:', {
          tokenLength: config.deviceToken.length,
          tokenPrefix: config.deviceToken.substring(0, 10) + '...',
          isString: typeof config.deviceToken === 'string',
          hasValue: !!config.deviceToken
        });
        
        // Try to decode token timestamp if it looks like it might contain one
        if (config.deviceToken.includes('_')) {
          const parts = config.deviceToken.split('_');
          console.log('🔐 Token parts:', parts.length);
          parts.forEach((part, index) => {
            if (!isNaN(Number(part)) && part.length >= 10) {
              const timestamp = Number(part);
              if (timestamp > 1000000000) { // Looks like a Unix timestamp
                const date = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
                console.log(`🔐 Token part ${index} timestamp:`, timestamp, '→', date.toISOString());
                console.log(`🔐 Token part ${index} age:`, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)), 'days old');
              }
            }
          });
        }
      } else {
        console.error('❌ No device token available! This will cause authentication errors.');
        console.error('❌ Config details:', {
          hasConfig: !!config,
          configKeys: config ? Object.keys(config) : [],
          deviceToken: config?.deviceToken
        });
        Alert.alert('Authentication Error', 'Device not properly configured. Please check device setup.');
        return;
      }

      console.log('🌐 Making check-in request to:', `${config.serverUrl}/visitors`);
      console.log('🔧 Request headers:', JSON.stringify(headers, null, 2));
      
      // Quick validation check for device token format
      if (config.deviceToken && config.deviceToken.length < 10) {
        console.warn('⚠️ Device token seems too short:', config.deviceToken.length, 'characters');
      }
      
      // Test the device token with a simple endpoint first
      console.log('🧪 Testing device token authentication...');
      try {
        const testResponse = await fetch(`${config.serverUrl}/device/themes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': config.deviceToken
          }
        });
        console.log('🧪 Token test response:', testResponse.status, testResponse.statusText);
        const testError = await testResponse.text();
        console.log('🧪 Token test response body:', testError);
        
        if (testResponse.status === 401) {
          console.error('🧪 Token test failed:', testError);
          
          // Show detailed error with next steps
          Alert.alert(
            'Device Authentication Failed', 
            `Your device token is invalid or expired.\n\nError: ${testError}\n\nNext steps:\n1. Go to Settings\n2. Click "Reset Configuration"\n3. Re-setup your device with fresh credentials`,
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'Go to Settings', 
                onPress: () => {
                  Alert.alert('Navigation', 'Please go to the Settings tab and reset your device configuration.');
                }
              }
            ]
          );
          return;
        } else if (testResponse.status >= 400) {
          const testError = await testResponse.text();
          console.error('🧪 Token test error:', testResponse.status, testError);
          Alert.alert('Connection Error', `Server returned ${testResponse.status}: ${testError}`);
          return;
        }
        
        console.log('✅ Device token authentication test passed');
      } catch (error) {
        console.warn('🧪 Token test failed with network error:', error);
        Alert.alert('Network Error', `Unable to test authentication: ${error.message}`);
        return;
      }
      
      // Test if the form exists on the server before submitting
      console.log('🧪 Testing if form exists on server:', formIdToUse);
      try {
        const formTestResponse = await fetch(`${config.serverUrl}/forms/${formIdToUse}`, {
          method: 'GET',
          headers: { 'X-Device-Token': config.deviceToken }
        });
        console.log('🧪 Form existence test:', formTestResponse.status);
        if (formTestResponse.status === 404) {
          Alert.alert('Form Not Found', `The selected form (${formIdToUse}) does not exist on the server. Please refresh forms or select a different form.`);
          return;
        }
      } catch (error) {
        console.warn('🧪 Could not test form existence:', error);
      }

      // Use the device-specific endpoint that we know works
      console.log('📡 Making check-in request to device endpoint...');
      const response = await fetch(`${config.serverUrl}/device/visitors`, {
        method: 'POST',
        headers,
        body: JSON.stringify(visitorData),
      });

      console.log('📡 Check-in response status:', response.status);
      console.log('📡 Check-in response ok:', response.ok);
      
      // Always read the response body to see what the server says
      const responseText = await response.text();
      console.log('📡 Check-in response body:', responseText);

      // Handle authentication errors
      if (response.status === 401) {
        console.error('🔄 Authentication failed (401):', responseText);
        
        if (responseText.includes('timestamp expired')) {
          console.error('🔄 Device token expired, needs refresh');
          Alert.alert(
            'Authentication Expired', 
            'Your device authentication has expired. Please go to Settings and refresh your configuration.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Settings', onPress: () => {
                Alert.alert('Info', 'Please navigate to the Settings tab and click "Refresh Configuration"');
              }}
            ]
          );
        } else if (responseText.includes('Authentication failed') || responseText.includes('credentials')) {
          console.error('🔄 Invalid device token or credentials');
          
          // Parse the error response to get more details
          let errorDetails = responseText;
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.error_code) {
              errorDetails = `Error: ${errorData.error_code}\nMessage: ${errorData.detail}\nTime: ${errorData.timestamp}`;
            }
          } catch (e) {
            // Keep original error text if parsing fails
          }
          
          Alert.alert(
            'Device Authentication Failed', 
            `The server cannot validate your device credentials.\n\n${errorDetails}\n\nThis usually means:\n• Device token is not registered on server\n• Device token format is incorrect\n• Device registration was incomplete\n\nSolution: Reset device configuration and re-register`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset & Re-register', onPress: () => {
                Alert.alert('Next Step', 'Go to Settings → Reset Configuration → Re-setup your device completely');
              }}
            ]
          );
        } else {
          console.error('🔄 Unknown authentication error');
          Alert.alert('Authentication Error', `Authentication failed: ${responseText}`);
        }
        return;
      }
      
      // Handle permission errors
      if (response.status === 403) {
        console.error('🔄 Permission denied (403):', responseText);
        Alert.alert(
          'Permission Denied', 
          'Your device does not have permission to perform this action. Please contact your administrator.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      if (response.ok) {
        // Try to get visitor name from form data for success message
        const visitorName = formData.name || formData.first_name || formData.full_name || 'Visitor';
        
        Alert.alert(
          'Check-in Successful',
          `Welcome ${visitorName}! You have been checked in.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              clearForm();
              if (onBackToWelcome) {
                onBackToWelcome();
              }
            }
          }]
        );
      } else {
        console.error('❌ Check-in failed with status:', response.status);
        
        // Try to parse validation errors for 422
        if (response.status === 422) {
          try {
            const errorData = JSON.parse(responseText);
            console.log('📋 Validation errors:', JSON.stringify(errorData, null, 2));
            
            if (errorData.detail) {
              const errorMessages = errorData.detail.map((err: any) => {
                const field = err.loc?.join('.') || 'unknown field';
                const message = err.msg || 'validation error';
                const type = err.type || 'unknown';
                return `Field: ${field}\nError: ${message}\nType: ${type}`;
              }).join('\n\n');
              
              Alert.alert('Validation Error', errorMessages);
            } else {
              Alert.alert('Validation Error', JSON.stringify(errorData, null, 2));
            }
          } catch {
            Alert.alert('Error', `Failed to check in (${response.status}): ${responseText}`);
          }
        } else {
          console.error('❌ Check-in failed with status:', response.status);
          console.error('❌ Full error response:', responseText);
          
          // Try to parse the error for more details
          try {
            const errorData = JSON.parse(responseText);
            console.error('❌ Parsed error data:', errorData);
            
            if (errorData.detail && errorData.detail.includes('form')) {
              Alert.alert('Form Error', `Form issue: ${errorData.detail}\n\nForm ID sent: ${formIdToUse}\nPlease check if this form exists on the server.`);
            } else {
              Alert.alert('Check-in Error', `Failed to check in (${response.status}): ${errorData.detail || responseText}`);
            }
          } catch {
            Alert.alert('Error', `Failed to check in (${response.status}): ${responseText}`);
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during check-in');
      console.error('Check-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        {onBackToWelcome && (
          <TouchableOpacity style={styles.backButton} onPress={onBackToWelcome}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { fontFamily: theme.fonts.heading, color: 'white' }]}>Visitor Check-in</Text>
        <Text style={[styles.subtitle, { fontFamily: theme.fonts.body, color: 'rgba(255, 255, 255, 0.9)' }]}>
          Welcome to {config?.companyName || 'our company'}
          {config?.locationName ? ` at ${config.locationName}` : ''}!
          {'\n'}Please fill in your details
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.form}>
        
        {/* Debug Info and Refresh */}
        <View style={styles.debugContainer}>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              console.log('🔄 Manual theme refresh triggered');
              loadDefaultFormFromTheme();
            }}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh Theme & Form</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#ef4444', marginTop: 8 }]}
            onPress={async () => {
              console.log('📋 Force refreshing forms cache...');
              setAllForms([]); // Clear cache
              await loadFirstAvailableForm(); // Load fresh forms
              Alert.alert('Forms Refreshed', 'Form cache cleared and refreshed from server');
            }}
          >
            <Text style={styles.refreshButtonText}>📋 Force Refresh Forms</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#10b981', marginTop: 8 }]}
            onPress={async () => {
              console.log('🎨 Checking theme configuration...');
              if (!config) return;
              
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }
              
              try {
                // Add cache-busting to get fresh theme data
                const cacheBuster = Date.now();
                const response = await fetch(`${config.serverUrl}/device/themes/active?_=${cacheBuster}`, {
                  method: 'GET',
                  headers,
                });
                console.log('🎨 Theme response status:', response.status);
                
                if (response.ok) {
                  const themeData = await response.json();
                  console.log('🎨 Full theme data:', JSON.stringify(themeData, null, 2));
                  
                  if (themeData?.theme?.formConfig) {
                    console.log('🎯 Form configuration found:', themeData.theme.formConfig);
                    console.log('🎯 Configured form IDs:', themeData.theme.formConfig.defaultFormIds);
                  } else {
                    console.log('❌ No form configuration in theme');
                  }
                } else {
                  const errorText = await response.text();
                  console.log('❌ Theme fetch failed:', response.status, errorText);
                }
              } catch (error) {
                console.log('❌ Theme fetch error:', error);
              }
              
              Alert.alert('Theme Check', 'Check console for theme configuration details');
            }}
          >
            <Text style={styles.refreshButtonText}>🎨 Check Theme Config</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#f59e0b', marginTop: 8 }]}
            onPress={async () => {
              console.log('🧪 Testing API endpoints...');
              if (!config) return;
              
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }
              
              // Test multiple endpoints to see which work
              const testEndpoints = [
                '/device/visitors',
                '/visitors', 
                '/device/themes',
                '/forms',
                '/device/status'
              ];
              
              for (const endpoint of testEndpoints) {
                try {
                  console.log(`🧪 Testing ${endpoint}...`);
                  const response = await fetch(`${config.serverUrl}${endpoint}`, {
                    method: 'GET',
                    headers
                  });
                  console.log(`🧪 ${endpoint} → ${response.status} ${response.statusText}`);
                  const text = await response.text();
                  console.log(`🧪 ${endpoint} response:`, text.substring(0, 200));
                } catch (error) {
                  console.log(`🧪 ${endpoint} → ERROR:`, error.message);
                }
              }
              
              Alert.alert('API Test', 'Check console for endpoint test results');
            }}
          >
            <Text style={styles.refreshButtonText}>🧪 Test API Endpoints</Text>
          </TouchableOpacity>
          <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
            Using form: {defaultFormId} | Last check: {lastThemeCheck ? new Date(lastThemeCheck).toLocaleTimeString() : 'Never'}
          </Text>
          {currentForm && (
            <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
              Form: {currentForm.name} | Fields: {currentForm.fields?.length || 0}
            </Text>
          )}
        </View>
        
        {/* Dynamic Form Fields */}
        {loadingForm ? (
          <View style={styles.noFormContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.noFormText, { fontFamily: theme.fonts.body, color: theme.colors.text }]}>Loading form...</Text>
          </View>
        ) : currentForm && currentForm.fields ? (
          <>
            {currentForm.name && (
              <Text style={[styles.formTitle, { fontFamily: theme.fonts.heading, color: theme.colors.text }]}>
                {currentForm.name}
              </Text>
            )}
            {currentForm.description && (
              <Text style={[styles.formDescription, { fontFamily: theme.fonts.body, color: theme.colors.textSecondary }]}>
                {currentForm.description}
              </Text>
            )}
            {currentForm.fields.map((field: FormField) => renderFormField(field))}
          </>
        ) : (
          <View style={styles.noFormContainer}>
            <Text style={[styles.noFormText, { fontFamily: theme.fonts.body, color: theme.colors.text }]}>
              No form loaded. Please refresh or check your configuration.
            </Text>
            <TouchableOpacity
              style={[styles.createFormButton, { backgroundColor: theme.colors.primary }]}
              onPress={loadDefaultFormFromTheme}
            >
              <Text style={[styles.createFormButtonText, { fontFamily: theme.fonts.button }]}>Retry Loading Form</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.checkInButton, 
            { backgroundColor: theme.colors.success },
            isLoading && styles.buttonDisabled
          ]} 
          onPress={handleCheckIn}
          disabled={isLoading}
        >
          <Text style={[styles.checkInButtonText, { fontFamily: theme.fonts.button }]}>
            {isLoading ? 'Checking In...' : 'Check In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
          <Text style={[styles.clearButtonText, { fontFamily: theme.fonts.button }]}>Clear Form</Text>
        </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Simple Check-Out Screen
function CheckOutScreen({ onBackToWelcome }: { onBackToWelcome?: () => void }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const { config } = useSimpleDeviceConfig();
  const { theme } = useTheme();

  useEffect(() => {
    fetchCheckedInVisitors();
  }, [config]);

  const fetchCheckedInVisitors = async () => {
    if (!config?.serverUrl || !config?.deviceToken) {
      console.error('❌ Missing server config for checkout screen');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Fetching checked-in visitors for checkout...');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Device-Token': config.deviceToken,
      };

      const response = await fetch(`${config.serverUrl}/device/visitors`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const allVisitors = await response.json();
        console.log('📋 All visitors fetched:', allVisitors.length);
        
        // Filter to show only checked-in visitors for this location
        const checkedInVisitors = allVisitors.filter((visitor: any) => 
          !visitor.check_out_time && 
          visitor.location_id === config.locationId
        );
        
        console.log('✅ Checked-in visitors for this location:', checkedInVisitors.length);
        setVisitors(checkedInVisitors);
      } else {
        console.error('❌ Failed to fetch visitors:', response.status);
        Alert.alert('Error', 'Failed to load visitors for checkout');
      }
    } catch (error) {
      console.error('❌ Error fetching checked-in visitors:', error);
      Alert.alert('Error', 'Unable to load visitors for checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (visitorId: string, visitorName: string) => {
    if (!config?.serverUrl || !config?.deviceToken) {
      Alert.alert('Error', 'Device not configured');
      return;
    }

    try {
      setCheckingOut(visitorId);
      console.log('🚪 Checking out visitor:', visitorId, visitorName);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Device-Token': config.deviceToken,
      };

      const response = await fetch(`${config.serverUrl}/device/visitors/${visitorId}/checkout`, {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        console.log('✅ Visitor checked out successfully');
        Alert.alert('Success', `${visitorName} has been checked out`);
        
        // Refresh the list
        await fetchCheckedInVisitors();
      } else {
        const errorText = await response.text();
        console.error('❌ Checkout failed:', response.status, errorText);
        Alert.alert('Error', `Failed to check out ${visitorName}`);
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      Alert.alert('Error', 'Network error during checkout');
    } finally {
      setCheckingOut(null);
    }
  };

  // Get the primary display value for a visitor (first non-empty field)
  const getVisitorPrimaryField = (data: any): { key: string, value: string } => {
    if (!data || typeof data !== 'object') {
      return { key: 'visitor', value: 'Unknown Visitor' };
    }
    
    // Get all non-empty fields
    const entries = Object.entries(data).filter(([key, value]) => 
      value !== null && value !== undefined && value !== ''
    );
    
    if (entries.length === 0) {
      return { key: 'visitor', value: 'Unknown Visitor' };
    }
    
    // Use the first field as the primary display
    const [key, value] = entries[0];
    return { 
      key: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      value: Array.isArray(value) ? value.join(', ') : String(value)
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading checked-in visitors...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        {onBackToWelcome && (
          <TouchableOpacity style={styles.backButton} onPress={onBackToWelcome}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { fontFamily: theme.fonts.heading, color: 'white' }]}>Visitor Check-Out</Text>
        <Text style={[styles.subtitle, { fontFamily: theme.fonts.body, color: 'rgba(255, 255, 255, 0.9)' }]}>
          Select a visitor to check out from {config?.locationName || 'this location'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.form}>
          {visitors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                No checked-in visitors
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                All visitors have been checked out or none have checked in yet.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.formTitle, { fontFamily: theme.fonts.heading, color: theme.colors.text }]}>
                Checked-In Visitors ({visitors.length})
              </Text>
              
              {visitors.map((visitor) => {
                const primaryField = getVisitorPrimaryField(visitor.data);
                return (
                  <View key={visitor.id} style={styles.visitorCard}>
                    <View style={styles.visitorInfo}>
                      <Text style={styles.visitorName}>
                        {primaryField.value}
                      </Text>
                      <Text style={styles.visitorFieldLabel}>
                        {primaryField.key}
                      </Text>
                      <Text style={styles.visitorTime}>
                        Checked in: {formatDate(visitor.check_in_time)} at {formatTime(visitor.check_in_time)}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.checkoutButton, checkingOut === visitor.id && styles.buttonDisabled]}
                      onPress={() => handleCheckout(visitor.id, primaryField.value)}
                      disabled={checkingOut === visitor.id}
                    >
                      {checkingOut === visitor.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.checkoutButtonText}>Check Out</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}
          
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
            onPress={fetchCheckedInVisitors}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh Visitors</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Simple History Screen
function HistoryScreen() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());
  const { config } = useSimpleDeviceConfig();

  useEffect(() => {
    fetchVisitors();
  }, [config]);

  const fetchVisitors = async () => {
    if (!config) return;

    try {
      setLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add device token if available
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/device/visitors`, { headers });
      if (response.ok) {
        const data = await response.json();
        setVisitors(data);
      } else {
        console.error('Failed to fetch visitors');
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (visitorId: string, visitorName: string) => {
    if (!config) return;

    Alert.alert(
      'Checkout Visitor',
      `Are you sure you want to check out ${visitorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Checkout', 
          onPress: async () => {
            try {
              setCheckingOut(visitorId);
              
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };

              // Add device token if available
              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }

              const response = await fetch(`${config.serverUrl}/device/visitors/${visitorId}/checkout`, {
                method: 'POST',
                headers,
              });

              if (response.ok) {
                Alert.alert('Success', `${visitorName} has been checked out successfully.`);
                // Refresh the visitor list
                await fetchVisitors();
              } else {
                const errorData = await response.text();
                Alert.alert('Error', `Failed to checkout visitor: ${errorData}`);
              }
            } catch (error) {
              Alert.alert('Error', 'Network error during checkout');
              console.error('Checkout error:', error);
            } finally {
              setCheckingOut(null);
            }
          }
        },
      ]
    );
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    // Force local timezone conversion and display
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short' // This will show the timezone abbreviation
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // Force local timezone conversion
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleExpanded = (visitorId: string) => {
    const newExpandedVisitors = new Set(expandedVisitors);
    if (newExpandedVisitors.has(visitorId)) {
      newExpandedVisitors.delete(visitorId);
    } else {
      newExpandedVisitors.add(visitorId);
    }
    setExpandedVisitors(newExpandedVisitors);
  };

  const renderVisitorDataFields = (data: any, isExpanded: boolean, skipFirstField: boolean = false) => {
    if (!data || typeof data !== 'object') return null;
    
    // Get all non-empty data fields
    const dataEntries = Object.entries(data).filter(([key, value]) => 
      value !== null && value !== undefined && value !== ''
    );
    
    if (dataEntries.length === 0) return null;
    
    // Skip the first field if it's already shown in the header
    const entriesToShow = skipFirstField ? dataEntries.slice(1) : dataEntries;
    
    if (entriesToShow.length === 0) return null;
    
    const fieldsToShow = isExpanded ? entriesToShow : entriesToShow.slice(0, 1);
    
    return (
      <View style={styles.visitorDataFields}>
        {fieldsToShow.map(([key, value]) => (
          <View key={key} style={styles.dataField}>
            <Text style={styles.dataFieldLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
            </Text>
            <Text style={styles.dataFieldValue}>
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </Text>
          </View>
        ))}
        {entriesToShow.length > 1 && (
          <Text style={styles.moreFieldsIndicator}>
            {isExpanded 
              ? 'Tap to show less' 
              : `+${entriesToShow.length - 1} more field${entriesToShow.length - 1 > 1 ? 's' : ''}`
            }
          </Text>
        )}
      </View>
    );
  };

  // Get the primary display value for a visitor (first non-empty field)
  const getVisitorPrimaryField = (data: any): { key: string, value: string } => {
    if (!data || typeof data !== 'object') {
      return { key: 'visitor', value: 'Unknown Visitor' };
    }
    
    // Get all non-empty fields
    const entries = Object.entries(data).filter(([key, value]) => 
      value !== null && value !== undefined && value !== ''
    );
    
    if (entries.length === 0) {
      return { key: 'visitor', value: 'Unknown Visitor' };
    }
    
    // Use the first field as the primary display
    const [key, value] = entries[0];
    return { 
      key: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      value: Array.isArray(value) ? value.join(', ') : String(value)
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading visitors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visitor History</Text>
        <Text style={styles.subtitle}>Recent visitor activity</Text>
      </View>

      <ScrollView style={styles.historyList}>
        {visitors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No visitors yet</Text>
            <Text style={styles.emptySubtext}>Visitors will appear here after checking in</Text>
          </View>
        ) : (
          visitors.map((visitor) => {
            const isExpanded = expandedVisitors.has(visitor.id);
            return (
              <View key={visitor.id} style={styles.visitorCard}>
                <TouchableOpacity 
                  style={styles.visitorHeader}
                  onPress={() => toggleExpanded(visitor.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.visitorInfo}>
                    {(() => {
                      const primaryField = getVisitorPrimaryField(visitor.data);
                      return (
                        <>
                          <Text style={styles.visitorName}>
                            {primaryField.value}
                          </Text>
                          <Text style={styles.visitorFieldLabel}>
                            {primaryField.key}
                          </Text>
                        </>
                      );
                    })()}
                    <Text style={styles.visitorTime}>
                      {formatDate(visitor.check_in_time)} at {formatTime(visitor.check_in_time)}
                    </Text>
                  </View>
                  <View style={styles.visitorActions}>
                    <View style={[styles.statusBadge, 
                      visitor.check_out_time ? styles.checkedOutBadge : styles.checkedInBadge]}>
                      <Text style={styles.statusText}>
                        {visitor.check_out_time ? 'Checked Out' : 'Checked In'}
                      </Text>
                    </View>
                    <Text style={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {/* Data fields section - skip the first field since it's shown in header */}
                {renderVisitorDataFields(visitor.data, isExpanded, true)}
                
                {/* Checkout button section */}
                {!visitor.check_out_time && (
                  <View style={styles.checkoutSection}>
                    <TouchableOpacity
                      style={[styles.checkoutButton, checkingOut === visitor.id && styles.buttonDisabled]}
                      onPress={() => {
                        const primaryField = getVisitorPrimaryField(visitor.data);
                        handleCheckout(visitor.id, primaryField.value);
                      }}
                      disabled={checkingOut === visitor.id}
                    >
                      {checkingOut === visitor.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.checkoutButtonText}>Check Out</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// Simple Analytics Screen
function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState({
    todayVisitors: 0,
    checkedIn: 0,
    monthlyTotal: 0,
    checkoutRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [allVisitors, setAllVisitors] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const { config } = useSimpleDeviceConfig();
  const { theme } = useTheme();

  useEffect(() => {
    fetchAnalytics();
  }, [config]);

  const fetchAnalytics = async () => {
    if (!config) return;

    try {
      setLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add device token if available
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      // Fetch visitors to calculate analytics
      const response = await fetch(`${config.serverUrl}/device/visitors`, { headers });
      if (response.ok) {
        const visitors = await response.json();
        setAllVisitors(visitors);
        calculateAnalytics(visitors);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (visitors) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayVisitors = visitors.filter(v => 
      new Date(v.check_in_time) >= startOfToday
    ).length;

    const checkedIn = visitors.filter(v => 
      !v.check_out_time
    ).length;

    const monthlyTotal = visitors.filter(v => 
      new Date(v.check_in_time) >= startOfMonth
    ).length;

    const checkedOutCount = visitors.filter(v => v.check_out_time).length;
    const checkoutRate = visitors.length > 0 ? Math.round((checkedOutCount / visitors.length) * 100) : 0;

    setAnalytics({
      todayVisitors,
      checkedIn,
      monthlyTotal,
      checkoutRate
    });
  };

  const getFilteredVisitors = (filterType: string) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (filterType) {
      case 'today':
        return allVisitors.filter(v => new Date(v.check_in_time) >= startOfToday);
      case 'checkedIn':
        return allVisitors.filter(v => !v.check_out_time);
      case 'monthly':
        return allVisitors.filter(v => new Date(v.check_in_time) >= startOfMonth);
      case 'checkedOut':
        return allVisitors.filter(v => v.check_out_time);
      default:
        return [];
    }
  };

  const openModal = (filterType: string, title: string) => {
    const filteredData = getFilteredVisitors(filterType);
    setModalData(filteredData);
    setModalTitle(title);
    setModalVisible(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getVisitorPrimaryField = (data: any) => {
    if (!data || typeof data !== 'object') return { key: 'No Data', value: 'N/A' };
    
    const entries = Object.entries(data);
    if (entries.length === 0) return { key: 'No Data', value: 'N/A' };
    
    const [firstKey, firstValue] = entries[0];
    return { key: firstKey, value: String(firstValue) };
  };

  const renderVisitorItem = ({ item }: { item: any }) => {
    const primaryField = getVisitorPrimaryField(item.data);
    return (
      <View style={styles.modalVisitorItem}>
        <View style={styles.modalVisitorInfo}>
          <Text style={styles.modalVisitorName}>{primaryField.value}</Text>
          <Text style={styles.modalVisitorField}>{primaryField.key}</Text>
          <Text style={styles.modalVisitorTime}>
            {formatDate(item.check_in_time)} at {formatTime(item.check_in_time)}
          </Text>
          {item.check_out_time && (
            <Text style={styles.modalCheckoutTime}>
              Checked out: {formatDate(item.check_out_time)} at {formatTime(item.check_out_time)}
            </Text>
          )}
        </View>
        <View style={[styles.modalStatusBadge, 
          item.check_out_time ? styles.checkedOutBadge : styles.checkedInBadge]}>
          <Text style={styles.statusText}>
            {item.check_out_time ? 'Out' : 'In'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Visitor statistics</Text>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => openModal('today', "Today's Visitors")}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{analytics.todayVisitors}</Text>
          <Text style={styles.statLabel}>Today's Visitors</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => openModal('checkedIn', 'Currently Checked In')}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{analytics.checkedIn}</Text>
          <Text style={styles.statLabel}>Currently Checked In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => openModal('monthly', 'This Month')}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{analytics.monthlyTotal}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => openModal('checkedOut', 'Checked Out Visitors')}
          activeOpacity={0.7}
        >
          <Text style={styles.statNumber}>{analytics.checkoutRate}%</Text>
          <Text style={styles.statLabel}>Check-out Rate</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for displaying visitor records */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalSubtitle}>{modalData.length} records</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          
          {modalData.length > 0 ? (
            <FlatList
              data={modalData}
              renderItem={renderVisitorItem}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.modalEmptyState}>
              <Text style={[styles.modalEmptyText, { color: theme.colors.textSecondary }]}>
                No records found for this category
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Simple Settings Screen
function SettingsScreen() {
  const { config, clearConfig, refreshConfig } = useSimpleDeviceConfig();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showWorkflowManagement, setShowWorkflowManagement] = useState(false);
  const [showFormManagement, setShowFormManagement] = useState(false);
  const [showThemeManagement, setShowThemeManagement] = useState(false);


  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshConfig();
      Alert.alert('Success', 'Configuration refreshed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh configuration');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Configuration',
      'Are you sure you want to reset the device configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          try {
            await clearConfig();
            Alert.alert('Success', 'Configuration reset successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to reset configuration');
          }
        }},
      ]
    );
  };

  const handleWorkflowManagement = () => {
    setShowWorkflowManagement(true);
  };

  const handleFormManagement = () => {
    setShowFormManagement(true);
  };

  const handleThemeManagement = () => {
    setShowThemeManagement(true);
  };


  // Show workflow management screen if requested
  if (showWorkflowManagement) {
    return (
      <WorkflowManagementScreen 
        onBack={() => setShowWorkflowManagement(false)}
      />
    );
  }

  // Show form management screen if requested
  if (showFormManagement) {
    return (
      <FormManagementScreen 
        onBack={() => setShowFormManagement(false)}
      />
    );
  }

  // Show theme management screen if requested
  if (showThemeManagement) {
    return (
      <ThemeManagementScreen 
        onBack={() => setShowThemeManagement(false)}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <Text style={[styles.title, { color: 'white' }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>Device configuration</Text>
      </View>

      <View style={styles.settingsContainer}>
        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Device ID</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.deviceId || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Company Name</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.companyName || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Location Name</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.locationName || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Server URL</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.serverUrl || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Status</Text>
          <Text style={[styles.settingValue, { color: theme.colors.success }]}>Active</Text>
        </View>


        {/* Workflow Management Section - Hidden */}
        {false && (
          <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Workflow Management</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Design and manage visitor workflows</Text>
            
            <TouchableOpacity
              style={[styles.workflowButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleWorkflowManagement}
            >
              <View style={styles.workflowButtonContent}>
                <View style={styles.workflowIconContainer}>
                  <FontAwesomeIcon icon={faCog} size={24} color="white" />
                </View>
                <View style={styles.workflowButtonText}>
                  <Text style={styles.workflowButtonTitle}>Configure Workflows</Text>
                  <Text style={styles.workflowButtonSubtitle}>Create multi-step visitor processes</Text>
                </View>
                <FontAwesomeIcon icon={faArrowRight} size={16} color="white" style={{ opacity: 0.8 }} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Form Builder Section */}
        <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.workflowButton, { backgroundColor: theme.colors.secondary || '#10b981' }]}
            onPress={handleFormManagement}
          >
            <View style={styles.workflowButtonContent}>
              <View style={styles.workflowIconContainer}>
                <FontAwesomeIcon icon={faEdit} size={24} color="white" />
              </View>
              <View style={styles.workflowButtonText}>
                <Text style={styles.workflowButtonTitle}>Manage Forms</Text>
                <Text style={styles.workflowButtonSubtitle}>Design custom registration forms</Text>
              </View>
              <FontAwesomeIcon icon={faArrowRight} size={16} color="white" style={{ opacity: 0.8 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Theme Management Section */}
        <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.workflowButton, { backgroundColor: '#8b5cf6' }]}
            onPress={handleThemeManagement}
          >
            <View style={styles.workflowButtonContent}>
              <View style={styles.workflowIconContainer}>
                <FontAwesomeIcon icon={faPalette} size={24} color="white" />
              </View>
              <View style={styles.workflowButtonText}>
                <Text style={styles.workflowButtonTitle}>Customize Themes</Text>
                <Text style={styles.workflowButtonSubtitle}>Design your visitor experience</Text>
              </View>
              <FontAwesomeIcon icon={faArrowRight} size={16} color="white" style={{ opacity: 0.8 }} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.resetButton, styles.refreshButton, { backgroundColor: theme.colors.primary }]} 
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.resetButtonText}>Refresh Configuration</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.resetButton, { backgroundColor: theme.colors.error }]} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset Configuration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Tab Icon Component with Custom Shapes
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const iconColor = focused ? '#2563eb' : '#6b7280';
  
  const renderIcon = () => {
    switch (name) {
      case 'Check-in':
        return (
          <View style={styles.iconContainer}>
            {/* Person icon */}
            <View style={[styles.personHead, { backgroundColor: iconColor }]} />
            <View style={[styles.personBody, { backgroundColor: iconColor }]} />
            {/* Plus sign */}
            <View style={[styles.plusVertical, { backgroundColor: iconColor }]} />
            <View style={[styles.plusHorizontal, { backgroundColor: iconColor }]} />
          </View>
        );
      case 'History':
        return (
          <View style={styles.iconContainer}>
            {/* List lines */}
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 4 }]} />
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 9 }]} />
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 14 }]} />
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 19 }]} />
          </View>
        );
      case 'Analytics':
        return (
          <View style={styles.iconContainer}>
            {/* Bar chart */}
            <View style={[styles.barChart1, { backgroundColor: iconColor }]} />
            <View style={[styles.barChart2, { backgroundColor: iconColor }]} />
            <View style={[styles.barChart3, { backgroundColor: iconColor }]} />
            <View style={[styles.barChart4, { backgroundColor: iconColor }]} />
          </View>
        );
      case 'Settings':
        return (
          <View style={styles.iconContainer}>
            {/* Gear shape */}
            <View style={[styles.gearCenter, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth1, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth2, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth3, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth4, { backgroundColor: iconColor }]} />
          </View>
        );
      default:
        return <View style={[styles.defaultIcon, { backgroundColor: iconColor }]} />;
    }
  };

  return (
    <View style={styles.tabIconWrapper}>
      {renderIcon()}
    </View>
  );
};

// Main Visitor App Component with Welcome Screen
function MainAppTabs({ onBackToWelcome }: { onBackToWelcome: () => void }) {
  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: Platform.OS === 'ios' ? 20 : 5,
            height: Platform.OS === 'ios' ? 85 : 65,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen
          name="Check-in"
          options={{
            title: 'Visitor Check-in',
            headerShown: false,
          }}
        >
          {() => <CheckInScreen onBackToWelcome={onBackToWelcome} />}
        </Tab.Screen>
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            title: 'Visitor History',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            title: 'Analytics',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerShown: false,
          }}
        />
      </Tab.Navigator>
  );
}

// Main Visitor App Component
export default function SimpleVisitorApp() {
  const { config } = useSimpleDeviceConfig();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSettingsFromWelcome, setShowSettingsFromWelcome] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const handleStartCheckIn = () => {
    setShowWelcome(false);
    setShowSettingsFromWelcome(false);
    setShowCheckOut(false);
  };

  const handleStartCheckOut = () => {
    setShowWelcome(false);
    setShowSettingsFromWelcome(false);
    setShowCheckOut(true);
  };

  const handleBackToWelcome = () => {
    setShowWelcome(true);
    setShowSettingsFromWelcome(false);
    setShowCheckOut(false);
  };

  const handleOpenSettings = () => {
    setShowWelcome(false);
    setShowSettingsFromWelcome(true);
    setShowCheckOut(false);
  };

  const selectedTheme: ThemeType = config?.theme || 'hightech';

  return (
    <EnhancedThemeProvider themeType={selectedTheme}>
      <ThemedApp 
        showWelcome={showWelcome}
        showSettingsFromWelcome={showSettingsFromWelcome}
        showCheckOut={showCheckOut}
        onStartCheckIn={handleStartCheckIn}
        onStartCheckOut={handleStartCheckOut}
        onBackToWelcome={handleBackToWelcome}
        onOpenSettings={handleOpenSettings}
      />
    </EnhancedThemeProvider>
  );
}

// Themed App Component
function ThemedApp({ 
  showWelcome, 
  showSettingsFromWelcome,
  showCheckOut,
  onStartCheckIn,
  onStartCheckOut, 
  onBackToWelcome,
  onOpenSettings
}: {
  showWelcome: boolean;
  showSettingsFromWelcome: boolean;
  showCheckOut: boolean;
  onStartCheckIn: () => void;
  onStartCheckOut: () => void;
  onBackToWelcome: () => void;
  onOpenSettings: () => void;
}) {
  if (showWelcome) {
    return <WelcomeScreen onStartCheckIn={onStartCheckIn} onStartCheckOut={onStartCheckOut} onOpenSettings={onOpenSettings} />;
  }

  if (showCheckOut) {
    return <CheckOutScreen onBackToWelcome={onBackToWelcome} />;
  }

  if (showSettingsFromWelcome) {
    return (
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Settings"
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => (
              <TabIcon name={route.name} focused={focused} />
            ),
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: '#6b7280',
            tabBarStyle: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              paddingBottom: Platform.OS === 'ios' ? 20 : 5,
              height: Platform.OS === 'ios' ? 85 : 65,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
            headerStyle: {
              backgroundColor: '#2563eb',
            },
            headerTintColor: 'white',
            headerTitleStyle: {
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Check-in"
            options={{
              title: 'Visitor Check-in',
              headerShown: false,
            }}
          >
            {() => <CheckInScreen onBackToWelcome={onBackToWelcome} />}
          </Tab.Screen>
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title: 'Visitor History',
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              title: 'Analytics',
              headerShown: false,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainAppTabs onBackToWelcome={onBackToWelcome} />
    </NavigationContainer>
  );
}

// Dynamic styles that change based on theme
const createDynamicStyles = (theme: any) => StyleSheet.create({
  welcomeTitle: {
    fontSize: responsiveFontSize(isTablet ? 42 : 32),
    textAlign: 'center',
    marginBottom: responsivePadding(8),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: responsiveFontSize(isTablet ? 24 : 20),
    textAlign: 'center',
    marginBottom: responsivePadding(16),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  welcomeInstruction: {
    fontSize: responsiveFontSize(isTablet ? 18 : 16),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageCard: {
    width: isLargeTablet ? '30%' : isTablet ? '45%' : '48%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.large,
    marginBottom: responsivePadding(16),
    marginHorizontal: isLargeTablet ? '1.5%' : 0,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: isTablet ? 160 : 140,
  },
  imageEmoji: {
    fontSize: responsiveFontSize(48),
    marginBottom: responsivePadding(12),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: responsivePadding(12),
    minHeight: 48,
  },
  imageName: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    marginBottom: responsivePadding(8),
    textAlign: 'center',
  },
  imageDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: responsiveFontSize(12),
    textAlign: 'center',
    paddingHorizontal: responsivePadding(8),
    lineHeight: responsiveFontSize(16),
  },
  clockTime: {
    fontSize: responsiveFontSize(isTablet ? 72 : 56),
    textAlign: 'center',
    marginBottom: responsivePadding(8),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  clockDate: {
    fontSize: responsiveFontSize(isTablet ? 20 : 16),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    ...(isTablet && {
      justifyContent: 'flex-start',
      alignItems: 'center',
    }),
  },
  header: {
    backgroundColor: '#2563eb',
    padding: responsivePadding(20),
    paddingTop: Platform.OS === 'ios' ? responsivePadding(50) : responsivePadding(20),
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    color: '#e0e7ff',
    textAlign: 'center',
    maxWidth: isTablet ? 600 : '100%',
    lineHeight: responsiveFontSize(22),
  },
  formContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 0,
  },
  form: {
    padding: responsivePadding(20),
    width: isTablet ? Math.min(600, screenWidth * 0.8) : '100%',
    maxWidth: 600,
  },
  inputGroup: {
    marginBottom: responsivePadding(20),
  },
  label: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: responsivePadding(12),
    fontSize: responsiveFontSize(16),
    backgroundColor: 'white',
    minHeight: isTablet ? 50 : 44,
  },
  checkInButton: {
    backgroundColor: '#16a34a',
    padding: responsivePadding(16),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: responsivePadding(20),
    marginBottom: 10,
    minHeight: isTablet ? 56 : 48,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#6b7280',
    padding: responsivePadding(12),
    borderRadius: 8,
    alignItems: 'center',
    minHeight: isTablet ? 48 : 40,
  },
  clearButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    top: responsivePadding(20),
    left: responsivePadding(20),
    zIndex: 1,
  },
  backButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsivePadding(20),
  },
  welcomeMessageContainer: {
    alignItems: 'center',
    marginBottom: responsivePadding(40),
    paddingHorizontal: responsivePadding(20),
  },
  welcomeCardsContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    maxWidth: isTablet ? 800 : '100%',
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsivePadding(30),
    paddingHorizontal: responsivePadding(20),
    width: '100%',
  },
  welcomeContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 20,
    paddingVertical: responsivePadding(20),
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isLargeTablet ? 'center' : 'space-between',
    maxWidth: isTablet ? 900 : '100%',
    width: '100%',
  },
  historyList: {
    padding: responsivePadding(20),
    width: '100%',
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(16),
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 80 : 60,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  visitorFieldLabel: {
    fontSize: responsiveFontSize(12),
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  visitorCompany: {
    fontSize: responsiveFontSize(14),
    color: '#6b7280',
    marginTop: 2,
  },
  visitorTime: {
    fontSize: responsiveFontSize(12),
    color: '#9ca3af',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  checkedInBadge: {
    backgroundColor: '#d1fae5',
  },
  checkedOutBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  visitorActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: isTablet ? 120 : 100,
  },
  checkoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(8),
    borderRadius: 6,
    marginTop: 8,
    minHeight: isTablet ? 36 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: isTablet ? 80 : 70,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  statsContainer: {
    padding: responsivePadding(20),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isLargeTablet ? 'center' : 'space-between',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(20),
    width: isLargeTablet ? '22%' : isTablet ? '45%' : '48%',
    marginBottom: 16,
    marginHorizontal: isLargeTablet ? '1.5%' : 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 120 : 100,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: responsiveFontSize(32),
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: responsiveFontSize(14),
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: responsiveFontSize(18),
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: responsiveFontSize(14),
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalVisitorItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalVisitorInfo: {
    flex: 1,
  },
  modalVisitorName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  modalVisitorField: {
    fontSize: responsiveFontSize(12),
    color: '#6b7280',
    marginBottom: 4,
  },
  modalVisitorTime: {
    fontSize: responsiveFontSize(12),
    color: '#6b7280',
  },
  modalCheckoutTime: {
    fontSize: responsiveFontSize(12),
    color: '#dc2626',
    marginTop: 2,
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  modalEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalEmptyText: {
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
    lineHeight: responsiveFontSize(24),
  },
  settingsContainer: {
    padding: responsivePadding(20),
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(10),
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: isTablet ? 60 : 50,
  },
  settingLabel: {
    fontSize: responsiveFontSize(16),
    color: '#374151',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: responsiveFontSize(16),
    color: '#6b7280',
  },
  activeStatus: {
    color: '#16a34a',
    fontWeight: '600',
  },
  settingSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(12),
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: responsiveFontSize(14),
    marginBottom: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: isTablet ? '48%' : '48%',
    aspectRatio: 1.5,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  themeCardSelected: {
    borderColor: '#ffffff',
  },
  themeEmoji: {
    fontSize: responsiveFontSize(28),
    marginBottom: 6,
  },
  themeName: {
    color: 'white',
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: responsiveFontSize(14),
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#dc2626',
    padding: responsivePadding(16),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: responsivePadding(20),
    minHeight: isTablet ? 56 : 48,
    justifyContent: 'center',
  },
  refreshButton: {
    backgroundColor: '#2563eb',
    marginTop: 10,
  },
  resetButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  visitorPurpose: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  visitorDataFields: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dataField: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dataFieldLabel: {
    fontSize: responsiveFontSize(12),
    color: '#6b7280',
    fontWeight: '500',
    width: 120,
  },
  dataFieldValue: {
    fontSize: responsiveFontSize(12),
    color: '#374151',
    flex: 1,
  },
  moreFieldsIndicator: {
    fontSize: responsiveFontSize(11),
    color: '#2563eb',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  checkoutSection: {
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  // Tab Icon Styles
  tabIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  
  // Check-in Icon (Person + Plus)
  personHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 2,
    left: 4,
  },
  personBody: {
    width: 8,
    height: 10,
    borderRadius: 4,
    position: 'absolute',
    top: 9,
    left: 3,
  },
  plusVertical: {
    width: 2,
    height: 8,
    position: 'absolute',
    top: 4,
    right: 3,
  },
  plusHorizontal: {
    width: 8,
    height: 2,
    position: 'absolute',
    top: 7,
    right: 0,
  },
  
  // History Icon (List)
  listLine: {
    width: 16,
    height: 2,
    position: 'absolute',
    left: 4,
    borderRadius: 1,
  },
  
  // Analytics Icon (Bar Chart)
  barChart1: {
    width: 3,
    height: 12,
    position: 'absolute',
    bottom: 2,
    left: 2,
  },
  barChart2: {
    width: 3,
    height: 16,
    position: 'absolute',
    bottom: 2,
    left: 6,
  },
  barChart3: {
    width: 3,
    height: 8,
    position: 'absolute',
    bottom: 2,
    left: 10,
  },
  barChart4: {
    width: 3,
    height: 14,
    position: 'absolute',
    bottom: 2,
    left: 14,
  },
  
  // Settings Icon (Gear)
  gearCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    left: 8,
  },
  gearTooth1: {
    width: 2,
    height: 4,
    position: 'absolute',
    top: 2,
    left: 11,
  },
  gearTooth2: {
    width: 4,
    height: 2,
    position: 'absolute',
    top: 11,
    left: 18,
  },
  gearTooth3: {
    width: 2,
    height: 4,
    position: 'absolute',
    top: 18,
    left: 11,
  },
  gearTooth4: {
    width: 4,
    height: 2,
    position: 'absolute',
    top: 11,
    left: 2,
  },
  
  // Default Icon
  defaultIcon: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  
  // Welcome Screen Settings Icon
  settingsIcon: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  settingsGearContainer: {
    width: responsivePadding(24),
    height: responsivePadding(24),
    position: 'relative',
  },
  settingsGear: {
    width: responsivePadding(12),
    height: responsivePadding(12),
    borderRadius: responsivePadding(6),
    position: 'absolute',
    top: responsivePadding(6),
    left: responsivePadding(6),
  },
  settingsTooth1: {
    width: responsivePadding(3),
    height: responsivePadding(6),
    position: 'absolute',
    top: 0,
    left: responsivePadding(10.5),
  },
  settingsTooth2: {
    width: responsivePadding(6),
    height: responsivePadding(3),
    position: 'absolute',
    top: responsivePadding(10.5),
    right: 0,
  },
  settingsTooth3: {
    width: responsivePadding(3),
    height: responsivePadding(6),
    position: 'absolute',
    bottom: 0,
    left: responsivePadding(10.5),
  },
  settingsTooth4: {
    width: responsivePadding(6),
    height: responsivePadding(3),
    position: 'absolute',
    top: responsivePadding(10.5),
    left: 0,
  },
  
  // Workflow Management Button
  workflowButton: {
    borderRadius: 12,
    padding: responsivePadding(12),
    marginTop: 8,
  },
  workflowButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workflowIcon: {
    fontSize: responsiveFontSize(24),
    marginRight: responsivePadding(16),
  },
  workflowIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsivePadding(16),
  },
  workflowButtonText: {
    flex: 1,
  },
  workflowButtonTitle: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    marginBottom: 4,
  },
  workflowButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: responsiveFontSize(12),
  },
  workflowArrow: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
  },
  
  // Debug container for check-in screen
  debugContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  
  // Form field styles
  formTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  formDescription: {
    fontSize: responsiveFontSize(14),
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
  },
  helpText: {
    fontSize: responsiveFontSize(12),
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: responsiveFontSize(12),
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  selectOptionText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  noFormContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noFormText: {
    fontSize: responsiveFontSize(16),
    textAlign: 'center',
    marginBottom: 16,
  },
  createFormButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  createFormButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
});