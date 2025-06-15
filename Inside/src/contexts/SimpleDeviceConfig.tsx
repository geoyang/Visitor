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
  deviceToken?: string;
  theme?: 'hightech' | 'lawfirm' | 'metropolitan' | 'zen';
  settings?: any;
}

interface SimpleDeviceConfigContextType {
  config: DeviceConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  setConfig: (config: DeviceConfig) => Promise<void>;
  updateTheme: (theme: 'hightech' | 'lawfirm' | 'metropolitan' | 'zen') => Promise<void>;
  clearConfig: () => Promise<void>;
  refreshConfig: () => Promise<void>;
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

  const updateTheme = async (newTheme: 'hightech' | 'lawfirm' | 'metropolitan' | 'zen') => {
    if (!config) return;
    
    try {
      const updatedConfig = {
        ...config,
        theme: newTheme
      };
      
      await setConfig(updatedConfig);
      console.log('Theme updated successfully to:', newTheme);
    } catch (error) {
      console.error('Error updating theme:', error);
      throw error;
    }
  };

  const refreshConfig = async () => {
    if (!config) return;
    
    try {
      console.log('Refreshing config from server...');
      console.log('Current config:', JSON.stringify(config, null, 2));
      let companyName = config.companyName || 'Unknown Company';
      let locationName = config.locationName || 'Unknown Location';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Fetch fresh company name
      try {
        console.log('Fetching company from:', `${config.serverUrl}/companies/${config.companyId}`);
        const companyResponse = await fetch(`${config.serverUrl}/companies/${config.companyId}`, { headers });
        console.log('Company response status:', companyResponse.status);
        
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          console.log('Company data received:', companyData);
          companyName = companyData.name || companyName;
          console.log('Updated company name:', companyName);
        } else {
          const errorText = await companyResponse.text();
          console.error('Company fetch failed:', errorText);
        }
      } catch (error) {
        console.warn('Failed to fetch company name:', error);
      }

      // Fetch fresh location name
      try {
        console.log('Fetching location from:', `${config.serverUrl}/locations/${config.locationId}`);
        const locationResponse = await fetch(`${config.serverUrl}/locations/${config.locationId}`, { headers });
        console.log('Location response status:', locationResponse.status);
        
        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          console.log('Location data received:', locationData);
          locationName = locationData.name || locationName;
          console.log('Updated location name:', locationName);
        } else {
          const errorText = await locationResponse.text();
          console.error('Location fetch failed:', errorText);
        }
      } catch (error) {
        console.warn('Failed to fetch location name:', error);
      }

      // Update config with fresh names
      const updatedConfig = {
        ...config,
        companyName,
        locationName
      };

      await setConfig(updatedConfig);
      console.log('Config refreshed successfully');
    } catch (error) {
      console.error('Error refreshing config:', error);
      throw error;
    }
  };

  const isConfigured = config !== null;

  const contextValue: SimpleDeviceConfigContextType = {
    config,
    isConfigured,
    isLoading,
    setConfig,
    updateTheme,
    clearConfig,
    refreshConfig,
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