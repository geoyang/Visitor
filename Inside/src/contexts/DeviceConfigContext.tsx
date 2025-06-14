import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceConfig {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
  deviceId: string;
  deviceName: string;
  serverUrl: string;
  settings?: {
    enableCamera?: boolean;
    enableLocation?: boolean;
    enableNotifications?: boolean;
    enableQRScanner?: boolean;
    autoPrintBadges?: boolean;
    requirePhoto?: boolean;
    requireSignature?: boolean;
    enableMultipleVisitors?: boolean;
    sessionTimeout?: number;
    theme?: {
      primaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
    };
  };
  lastUpdated?: string;
}

interface DeviceConfigContextType {
  config: DeviceConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  setConfig: (config: DeviceConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  updateSettings: (settings: Partial<DeviceConfig['settings']>) => Promise<void>;
  refreshConfig: () => Promise<void>;
  getApiUrl: (endpoint: string) => string;
}

const DeviceConfigContext = createContext<DeviceConfigContextType | undefined>(undefined);

interface DeviceConfigProviderProps {
  children: ReactNode;
}

export const DeviceConfigProvider: React.FC<DeviceConfigProviderProps> = ({ children }) => {
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
      const configWithTimestamp = {
        ...newConfig,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('device_config', JSON.stringify(configWithTimestamp));
      setConfigState(configWithTimestamp);
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

  const updateSettings = async (newSettings: Partial<DeviceConfig['settings']>) => {
    if (!config) throw new Error('No configuration found');

    try {
      const updatedConfig = {
        ...config,
        settings: {
          ...config.settings,
          ...newSettings,
        },
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem('device_config', JSON.stringify(updatedConfig));
      setConfigState(updatedConfig);
    } catch (error) {
      console.error('Error updating device settings:', error);
      throw error;
    }
  };

  const refreshConfig = async () => {
    if (!config) return;

    try {
      // Refresh device info from server
      const response = await fetch(`${config.serverUrl}/devices/${config.deviceId}`);
      if (response.ok) {
        const deviceInfo = await response.json();
        
        const refreshedConfig = {
          ...config,
          deviceName: deviceInfo.name,
          companyName: deviceInfo.company_name || config.companyName,
          locationName: deviceInfo.location_name || config.locationName,
          settings: {
            ...config.settings,
            ...deviceInfo.settings,
          },
          lastUpdated: new Date().toISOString(),
        };

        await AsyncStorage.setItem('device_config', JSON.stringify(refreshedConfig));
        setConfigState(refreshedConfig);
      }
    } catch (error) {
      console.error('Error refreshing device config:', error);
      // Don't throw here, as we want the app to continue working even if refresh fails
    }
  };

  const getApiUrl = (endpoint: string) => {
    if (!config) throw new Error('No configuration found');
    
    const baseUrl = config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseUrl}${cleanEndpoint}`;
  };

  const isConfigured = config !== null;

  const contextValue: DeviceConfigContextType = {
    config,
    isConfigured,
    isLoading,
    setConfig,
    clearConfig,
    updateSettings,
    refreshConfig,
    getApiUrl,
  };

  return (
    <DeviceConfigContext.Provider value={contextValue}>
      {children}
    </DeviceConfigContext.Provider>
  );
};

export const useDeviceConfig = () => {
  const context = useContext(DeviceConfigContext);
  if (context === undefined) {
    throw new Error('useDeviceConfig must be used within a DeviceConfigProvider');
  }
  return context;
};

// Hook for getting API service with device config
export const useApiService = () => {
  const { config, getApiUrl } = useDeviceConfig();

  const apiService = {
    // Visitors
    getVisitors: async (params?: { status?: string; limit?: number; skip?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.skip) searchParams.append('skip', params.skip.toString());
      
      const response = await fetch(`${getApiUrl('/visitors')}?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch visitors');
      return response.json();
    },

    createVisitor: async (visitorData: any) => {
      const response = await fetch(getApiUrl('/visitors'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitorData),
      });
      if (!response.ok) throw new Error('Failed to create visitor');
      return response.json();
    },

    updateVisitor: async (visitorId: string, updateData: any) => {
      const response = await fetch(getApiUrl(`/visitors/${visitorId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error('Failed to update visitor');
      return response.json();
    },

    checkOutVisitor: async (visitorId: string) => {
      const response = await fetch(getApiUrl(`/visitors/${visitorId}/checkout`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to check out visitor');
      return response.json();
    },

    // Device heartbeat
    sendHeartbeat: async () => {
      if (!config) throw new Error('Device not configured');
      
      const response = await fetch(getApiUrl(`/devices/${config.deviceId}/heartbeat`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to send heartbeat');
      return response.json();
    },

    // Analytics
    getAnalytics: async () => {
      const response = await fetch(getApiUrl('/analytics/summary'));
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },

    // Forms
    getForms: async () => {
      const response = await fetch(getApiUrl('/forms'));
      if (!response.ok) throw new Error('Failed to fetch forms');
      return response.json();
    },

    createForm: async (formData: any) => {
      const response = await fetch(getApiUrl('/forms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create form');
      return response.json();
    },

    // Health check
    healthCheck: async () => {
      const response = await fetch(getApiUrl('/health'));
      if (!response.ok) throw new Error('Health check failed');
      return response.json();
    },
  };

  return apiService;
};