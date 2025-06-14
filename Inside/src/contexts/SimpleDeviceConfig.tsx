import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceConfig {
  companyId: string;
  companyName?: string;
  locationId: string;
  locationName?: string;
  deviceId: string;
  deviceName?: string;
  serverUrl: string;
  settings?: any;
}

interface SimpleDeviceConfigContextType {
  config: DeviceConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  setConfig: (config: DeviceConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
}

const SimpleDeviceConfigContext = createContext<SimpleDeviceConfigContextType | undefined>(undefined);

interface SimpleDeviceConfigProviderProps {
  children: ReactNode;
}

export const SimpleDeviceConfigProvider: React.FC<SimpleDeviceConfigProviderProps> = ({ children }) => {
  const [config, setConfigState] = useState<DeviceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await AsyncStorage.getItem('device_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfigState(parsedConfig);
      }
    } catch (error) {
      console.error('Error loading device config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setConfig = async (newConfig: DeviceConfig) => {
    try {
      await AsyncStorage.setItem('device_config', JSON.stringify(newConfig));
      setConfigState(newConfig);
    } catch (error) {
      console.error('Error saving device config:', error);
      throw error;
    }
  };

  const clearConfig = async () => {
    try {
      await AsyncStorage.removeItem('device_config');
      setConfigState(null);
    } catch (error) {
      console.error('Error clearing device config:', error);
      throw error;
    }
  };

  const isConfigured = config !== null;

  const contextValue: SimpleDeviceConfigContextType = {
    config,
    isConfigured,
    isLoading,
    setConfig,
    clearConfig,
  };

  return (
    <SimpleDeviceConfigContext.Provider value={contextValue}>
      {children}
    </SimpleDeviceConfigContext.Provider>
  );
};

export const useSimpleDeviceConfig = () => {
  const context = useContext(SimpleDeviceConfigContext);
  if (context === undefined) {
    throw new Error('useSimpleDeviceConfig must be used within a SimpleDeviceConfigProvider');
  }
  return context;
};