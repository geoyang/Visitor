import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface Company {
  id: string;
  name: string;
  domain?: string;
  status: string;
  locations_count: number;
  devices_count: number;
  active_visitors_count: number;
}

interface Location {
  id: string;
  company_id: string;
  company_name?: string;
  name: string;
  address: string;
  status: string;
  devices_count: number;
  active_visitors_count: number;
}

interface Device {
  id: string;
  company_id: string;
  company_name?: string;
  location_id: string;
  location_name?: string;
  name: string;
  device_type: string;
  device_id: string;
  status: string;
  is_online: boolean;
}

interface DeviceConfig {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
  deviceId: string;
  deviceName: string;
  serverUrl: string;
}

interface EnhancedDeviceConfigProps {
  onConfigComplete: (config: DeviceConfig) => void;
}

const EnhancedDeviceConfig: React.FC<EnhancedDeviceConfigProps> = ({ onConfigComplete }) => {
  const [configMode, setConfigMode] = useState<'simple' | 'guided'>('simple');
  const [step, setStep] = useState<'server' | 'company' | 'location' | 'device'>('server');
  const [loading, setLoading] = useState(false);
  
  // Server configuration
  const [serverUrl, setServerUrl] = useState('http://localhost:8000');
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [useCustomServer, setUseCustomServer] = useState(false);
  
  // Simple mode (direct input)
  const [simpleCompanyId, setSimpleCompanyId] = useState('');
  const [simpleLocationId, setSimpleLocationId] = useState('');
  const [simpleDeviceId, setSimpleDeviceId] = useState('');
  
  // Guided mode (selections)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // New device creation
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('tablet');

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('device_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        onConfigComplete(config);
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  };

  const saveConfig = async (config: DeviceConfig) => {
    try {
      await AsyncStorage.setItem('device_config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const getApiBaseUrl = () => {
    return useCustomServer ? customServerUrl : serverUrl;
  };

  const testServerConnection = async () => {
    const url = getApiBaseUrl();
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        const healthData = await response.json();
        Alert.alert('Success', `Connected to server: ${healthData.status}`);
        
        if (configMode === 'guided') {
          setStep('company');
          loadCompanies();
        } else {
          setStep('company'); // Move to simple form
        }
      } else {
        Alert.alert('Error', 'Server is not responding correctly');
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/companies`);
      if (response.ok) {
        const companiesData = await response.json();
        setCompanies(companiesData);
      } else {
        Alert.alert('Error', 'Failed to load companies');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading companies');
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = async (company: Company) => {
    setSelectedCompany(company);
    setStep('location');
    await loadLocations(company.id);
  };

  const loadLocations = async (companyId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/companies/${companyId}/locations`);
      if (response.ok) {
        const locationsData = await response.json();
        setLocations(Array.isArray(locationsData) ? locationsData : [locationsData]);
      } else {
        Alert.alert('Error', 'Failed to load locations');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading locations');
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = async (location: Location) => {
    setSelectedLocation(location);
    setStep('device');
    await loadDevices(location.id);
  };

  const loadDevices = async (locationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/devices?location_id=${locationId}`);
      if (response.ok) {
        const devicesData = await response.json();
        setDevices(Array.isArray(devicesData) ? devicesData : [devicesData]);
      } else {
        Alert.alert('Error', 'Failed to load devices');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading devices');
    } finally {
      setLoading(false);
    }
  };

  const selectDevice = (device: Device) => {
    completeConfiguration({
      companyId: device.company_id,
      companyName: device.company_name || selectedCompany?.name || '',
      locationId: device.location_id,
      locationName: device.location_name || selectedLocation?.name || '',
      deviceId: device.id,
      deviceName: device.name,
      serverUrl: getApiBaseUrl(),
    });
  };

  const createNewDevice = async () => {
    if (!selectedLocation || !newDeviceName.trim() || !newDeviceId.trim()) {
      Alert.alert('Error', 'Please fill in all device information');
      return;
    }

    setLoading(true);
    try {
      const deviceData = {
        name: newDeviceName.trim(),
        device_type: newDeviceType,
        device_id: newDeviceId.trim(),
        status: 'active',
        settings: {
          auto_photos: true,
          print_badges: false,
        },
      };

      const response = await fetch(`${getApiBaseUrl()}/locations/${selectedLocation.id}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData),
      });

      if (response.ok) {
        const newDevice = await response.json();
        completeConfiguration({
          companyId: newDevice.company_id,
          companyName: selectedCompany?.name || '',
          locationId: newDevice.location_id,
          locationName: selectedLocation.name,
          deviceId: newDevice.id,
          deviceName: newDevice.name,
          serverUrl: getApiBaseUrl(),
        });
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to create device');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while creating device');
    } finally {
      setLoading(false);
    }
  };

  const completeSimpleConfiguration = () => {
    if (!simpleCompanyId.trim() || !simpleLocationId.trim() || !simpleDeviceId.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    completeConfiguration({
      companyId: simpleCompanyId.trim(),
      companyName: 'Manual Configuration',
      locationId: simpleLocationId.trim(),
      locationName: 'Manual Configuration',
      deviceId: simpleDeviceId.trim(),
      deviceName: 'Manual Configuration',
      serverUrl: getApiBaseUrl(),
    });
  };

  const completeConfiguration = async (config: DeviceConfig) => {
    await saveConfig(config);
    onConfigComplete(config);
  };

  const renderServerStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Server Configuration</Text>
      <Text style={styles.stepDescription}>
        Configure the backend server connection
      </Text>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Use custom server URL</Text>
        <Switch
          value={useCustomServer}
          onValueChange={setUseCustomServer}
          trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
          thumbColor={useCustomServer ? '#ffffff' : '#ffffff'}
        />
      </View>

      {useCustomServer ? (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Custom Server URL</Text>
          <TextInput
            style={styles.textInput}
            value={customServerUrl}
            onChangeText={setCustomServerUrl}
            placeholder="http://your-server.com:8000"
            autoCapitalize="none"
            autoComplete="url"
            autoCorrect={false}
          />
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Server URL</Text>
          <TextInput
            style={styles.textInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:8000"
            autoCapitalize="none"
            autoComplete="url"
            autoCorrect={false}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={testServerConnection}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>Test Connection & Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderModeSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configuration Mode</Text>
      <Text style={styles.stepDescription}>
        Choose how you want to configure this device
      </Text>

      <TouchableOpacity
        style={[styles.modeButton, configMode === 'simple' && styles.selectedModeButton]}
        onPress={() => setConfigMode('simple')}
      >
        <Text style={[styles.modeButtonText, configMode === 'simple' && styles.selectedModeButtonText]}>
          Simple Mode
        </Text>
        <Text style={styles.modeButtonDescription}>
          Enter IDs directly if you know them
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modeButton, configMode === 'guided' && styles.selectedModeButton]}
        onPress={() => setConfigMode('guided')}
      >
        <Text style={[styles.modeButtonText, configMode === 'guided' && styles.selectedModeButtonText]}>
          Guided Setup
        </Text>
        <Text style={styles.modeButtonDescription}>
          Browse and select from available options
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSimpleConfigForm = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Device Configuration</Text>
      <Text style={styles.stepDescription}>
        Enter the device configuration details
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Company ID</Text>
        <TextInput
          style={styles.textInput}
          value={simpleCompanyId}
          onChangeText={setSimpleCompanyId}
          placeholder="Enter company ID"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location ID</Text>
        <TextInput
          style={styles.textInput}
          value={simpleLocationId}
          onChangeText={setSimpleLocationId}
          placeholder="Enter location ID"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Device ID</Text>
        <TextInput
          style={styles.textInput}
          value={simpleDeviceId}
          onChangeText={setSimpleDeviceId}
          placeholder="Enter device ID"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={completeSimpleConfiguration}
      >
        <Text style={styles.primaryButtonText}>Complete Configuration</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setStep('server')}
      >
        <Text style={styles.secondaryButtonText}>Back to Server Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGuidedSteps = () => {
    // Implementation of guided steps (company, location, device selection)
    // This would be similar to the existing company_setup.tsx but adapted for our API
    if (step === 'company') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Select Company</Text>
          <Text style={styles.stepDescription}>
            Choose your company from the list
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
          ) : (
            <ScrollView style={styles.listContainer}>
              {companies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={styles.listItem}
                  onPress={() => selectCompany(company)}
                >
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{company.name}</Text>
                    <Text style={styles.listItemSubtitle}>
                      {company.locations_count} locations • {company.devices_count} devices
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep('server')}
          >
            <Text style={styles.secondaryButtonText}>Back to Server</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'location') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Select Location</Text>
          <Text style={styles.stepDescription}>
            Choose the location for this device
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
          ) : (
            <ScrollView style={styles.listContainer}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={styles.listItem}
                  onPress={() => selectLocation(location)}
                >
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{location.name}</Text>
                    <Text style={styles.listItemSubtitle}>{location.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep('company')}
          >
            <Text style={styles.secondaryButtonText}>Back to Companies</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'device') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Select or Create Device</Text>
          <Text style={styles.stepDescription}>
            Choose an existing device or create a new one
          </Text>

          {!isCreatingDevice ? (
            <>
              {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
              ) : (
                <>
                  <ScrollView style={styles.listContainer}>
                    {devices.map((device) => (
                      <TouchableOpacity
                        key={device.id}
                        style={styles.listItem}
                        onPress={() => selectDevice(device)}
                      >
                        <View style={styles.listItemContent}>
                          <Text style={styles.listItemTitle}>{device.name}</Text>
                          <Text style={styles.listItemSubtitle}>
                            {device.device_type} • {device.device_id}
                          </Text>
                        </View>
                        <View style={[styles.statusDot, device.is_online ? styles.onlineDot : styles.offlineDot]} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setIsCreatingDevice(true)}
                  >
                    <Text style={styles.secondaryButtonText}>Create New Device</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Device Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDeviceName}
                  onChangeText={setNewDeviceName}
                  placeholder="e.g., Reception Tablet"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Device ID</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDeviceId}
                  onChangeText={setNewDeviceId}
                  placeholder="e.g., TABLET-001"
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={createNewDevice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Device</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setIsCreatingDevice(false)}
              >
                <Text style={styles.secondaryButtonText}>Back to Device List</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep('location')}
          >
            <Text style={styles.secondaryButtonText}>Back to Locations</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Configuration</Text>
        <Text style={styles.headerSubtitle}>
          Set up this device for visitor management
        </Text>
      </View>

      {step === 'server' && renderServerStep()}
      {step === 'company' && configMode === 'simple' && renderModeSelection()}
      {step === 'company' && configMode === 'simple' && renderSimpleConfigForm()}
      {step === 'company' && configMode === 'guided' && renderGuidedSteps()}
      {(step === 'location' || step === 'device') && renderGuidedSteps()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginTop: 4,
  },
  stepContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  modeButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  selectedModeButton: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  selectedModeButtonText: {
    color: '#2563eb',
  },
  modeButtonDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  loader: {
    marginVertical: 40,
  },
  listContainer: {
    maxHeight: 300,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: '#16a34a',
  },
  offlineDot: {
    backgroundColor: '#dc2626',
  },
});

export default EnhancedDeviceConfig;