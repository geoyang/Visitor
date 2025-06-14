import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import { SimpleDeviceConfigProvider, useSimpleDeviceConfig, DeviceConfig } from './src/contexts/SimpleDeviceConfig';
import WorkingSimpleConfig from './src/components/working_simple_config';
import SimpleVisitorApp from './src/components/SimpleVisitorApp';

function AppContent() {
  const { config, isConfigured, isLoading, setConfig } = useSimpleDeviceConfig();

  const handleConfigComplete = async (newConfig: DeviceConfig) => {
    try {
      await setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    );
  }

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

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <SimpleVisitorApp />
        <StatusBar style="auto" />
        <FlashMessage position="top" />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SimpleDeviceConfigProvider>
      <AppContent />
    </SimpleDeviceConfigProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 16,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  resetButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});