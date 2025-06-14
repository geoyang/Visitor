import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { QueryClient, QueryClientProvider } from 'react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your components
import VisitorApp from './src/components/visitor_app_main';
import VisitorAppMultitenant from './src/components/visitor_app_multitenant';
import CompanySetup from './src/components/company_setup';
import EnhancedDeviceConfig from './src/components/enhanced_device_config';
import QRConfigSetup from './src/components/qr_config_setup';
import ConfigModeSelector from './src/components/config_mode_selector';
import WorkingSimpleConfig from './src/components/working_simple_config';
import { SimpleDeviceConfigProvider, useSimpleDeviceConfig } from './src/contexts/SimpleDeviceConfig';
import FormBuilder from './src/components/form_builder_component';
import AnalyticsDashboard from './src/screens/analytics_dashboard';
import  VisitorHistoryScreen from './src/screens/enhanced_visitor_history';
import { SettingsScreen } from './src/screens/additional_screens';

// Icons (you can replace with your preferred icon library)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={[styles.tabIconText, focused && styles.tabIconTextFocused]}>
      {name.charAt(0).toUpperCase()}
    </Text>
  </View>
);

// Navigation setup
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function MainTabs() {
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
        component={VisitorApp}
        options={{
          title: 'Visitor Check-in',
          headerShown: false, // VisitorApp has its own header
        }}
      />
      <Tab.Screen
        name="History"
        component={VisitorHistoryScreen}
        options={{
          title: 'Visitor History',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsDashboard}
        options={{
          title: 'Analytics',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FormBuilder"
        component={FormBuilder}
        options={{
          title: 'Form Builder',
          presentation: 'modal',
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: 'white',
        }}
      />
    </Stack.Navigator>
  );
}

interface TenantConfig {
  companyId: string;
  companySlug: string;
  locationId: string;
  deviceId: string;
}

interface DeviceConfig {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
  deviceId: string;
  deviceName: string;
  serverUrl: string;
  settings?: any;
}

// Inner app component that uses the device config context
function AppContent() {
  const { config, isConfigured, isLoading, setConfig } = useSimpleDeviceConfig();
  const [configMode, setConfigMode] = useState<'legacy' | 'enhanced'>('enhanced');

  const handleConfigComplete = async (newConfig: DeviceConfig) => {
    try {
      await setConfig(newConfig);
      // Configuration will automatically trigger re-render due to context change
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    );
  }

  // Show configuration screen if not configured
  if (!isConfigured) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container}>
          <WorkingSimpleConfig onConfigComplete={handleConfigComplete} />
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Main app with configuration
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaView style={styles.container}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [isMultitenantMode, setIsMultitenantMode] = useState(false); // Default to new enhanced mode

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync({
          // Add any custom fonts here
        });

        // Check if we have saved tenant configuration
        const savedConfig = await AsyncStorage.getItem('company_config');
        if (savedConfig && isMultitenantMode) {
          setTenantConfig(JSON.parse(savedConfig));
        }

        // Artificially delay for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, [isMultitenantMode]);

  const handleSetupComplete = (config: TenantConfig) => {
    setTenantConfig(config);
  };

  const handleConfigError = () => {
    setTenantConfig(null);
  };

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Visitor Management...</Text>
      </View>
    );
  }

  // Show multitenant setup if in multitenant mode and no config
  if (isMultitenantMode && !tenantConfig) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <CompanySetup onSetupComplete={handleSetupComplete} />
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // If in multitenant mode with config, use multitenant app
  if (isMultitenantMode && tenantConfig) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <VisitorAppMultitenant 
            tenantConfig={tenantConfig}
            onConfigError={handleConfigError}
          />
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Use enhanced configuration mode by default
  if (!isMultitenantMode) {
    return (
      <SimpleDeviceConfigProvider>
        <AppContent />
      </SimpleDeviceConfigProvider>
    );
  }

  // Legacy multitenant mode (keep for backward compatibility)
  // Show multitenant setup if in multitenant mode and no config
  if (isMultitenantMode && !tenantConfig) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <CompanySetup onSetupComplete={handleSetupComplete} />
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // If in multitenant mode with config, use multitenant app
  if (isMultitenantMode && tenantConfig) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <VisitorAppMultitenant 
            tenantConfig={tenantConfig}
            onConfigError={handleConfigError}
          />
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Default single-tenant mode (fallback)
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
          <FlashMessage position="top" />
        </SafeAreaView>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: '#2563eb',
  },
  tabIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabIconTextFocused: {
    color: 'white',
  },
});