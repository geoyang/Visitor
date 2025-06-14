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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: string;
  locations_count: number;
  devices_count: number;
  active_visitors_count: number;
}

interface Location {
  id: string;
  name: string;
  address: string;
  status: string;
  devices_count: number;
  active_visitors_count: number;
}

interface Device {
  id: string;
  name: string;
  device_type: string;
  device_id: string;
  status: string;
  is_online: boolean;
  location_name: string;
}

interface CompanySetupProps {
  onSetupComplete: (config: {
    companyId: string;
    companySlug: string;
    locationId: string;
    deviceId: string;
  }) => void;
}

const CompanySetup: React.FC<CompanySetupProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<'company' | 'location' | 'device'>('company');
  const [loading, setLoading] = useState(false);
  const [companySlug, setCompanySlug] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isNewDevice, setIsNewDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');

  const API_BASE = 'http://localhost:8000'; // Docker backend API

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('company_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        // Auto-complete setup if config exists
        onSetupComplete(config);
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  };

  const saveConfig = async (config: any) => {
    try {
      await AsyncStorage.setItem('company_config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const validateCompany = async () => {
    if (!companySlug.trim()) {
      Alert.alert('Error', 'Please enter a company identifier');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/companies/validate/${companySlug.toLowerCase().trim()}`);

      if (response.ok) {
        const validationResult = await response.json();
        
        if (validationResult.valid) {
          // Company is valid, fetch analytics
          const analyticsResponse = await fetch(`${API_BASE}/analytics/company`, {
            headers: {
              'X-Company-Slug': companySlug.toLowerCase().trim(),
            },
          });

          if (analyticsResponse.ok) {
            const analytics = await analyticsResponse.json();
            
            setSelectedCompany({
              id: validationResult.company.id,
              name: validationResult.company.name,
              slug: validationResult.company.slug,
              domain: '',
              status: validationResult.company.status,
              locations_count: analytics.total_locations,
              devices_count: analytics.total_devices,
              active_visitors_count: analytics.active_visitors,
            });

            setStep('location');
            loadLocations();
          } else {
            Alert.alert('Error', 'Failed to load company analytics');
          }
        } else {
          Alert.alert('Error', 'Invalid company identifier');
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Company not found');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/locations`, {
        headers: {
          'X-Company-Slug': selectedCompany.slug,
        },
      });

      if (response.ok) {
        const locationsData = await response.json();
        setLocations(locationsData);
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
    loadDevices(location.id);
  };

  const loadDevices = async (locationId: string) => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/devices?location_id=${locationId}`, {
        headers: {
          'X-Company-Slug': selectedCompany.slug,
        },
      });

      if (response.ok) {
        const devicesData = await response.json();
        setDevices(devicesData);
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
    setSelectedDevice(device);
    completeSetup(device.id);
  };

  const createNewDevice = async () => {
    if (!selectedCompany || !selectedLocation) return;
    if (!newDeviceName.trim() || !newDeviceId.trim()) {
      Alert.alert('Error', 'Please fill in all device information');
      return;
    }

    setLoading(true);
    try {
      const deviceData = {
        company_id: selectedCompany.id,
        location_id: selectedLocation.id,
        name: newDeviceName.trim(),
        device_type: 'tablet',
        device_id: newDeviceId.trim(),
        status: 'active',
        settings: {
          auto_photos: true,
          print_badges: false,
        },
        assigned_forms: [],
      };

      const response = await fetch(`${API_BASE}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Slug': selectedCompany.slug,
        },
        body: JSON.stringify(deviceData),
      });

      if (response.ok) {
        const newDevice = await response.json();
        completeSetup(newDevice.id);
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

  const completeSetup = async (deviceId: string) => {
    if (!selectedCompany || !selectedLocation) return;

    const config = {
      companyId: selectedCompany.id,
      companySlug: selectedCompany.slug,
      locationId: selectedLocation.id,
      deviceId: deviceId,
    };

    await saveConfig(config);
    onSetupComplete(config);
  };

  const renderCompanyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Company Setup</Text>
      <Text style={styles.stepDescription}>
        Enter your company identifier to get started
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Company Identifier</Text>
        <TextInput
          style={styles.textInput}
          value={companySlug}
          onChangeText={setCompanySlug}
          placeholder="e.g., acme-corp"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
        />
        <Text style={styles.inputHint}>
          This is provided by your administrator
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={validateCompany}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Location</Text>
      <Text style={styles.stepDescription}>
        Choose the location where this device will be used
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <>
          {locations.length === 0 ? (
            <Text style={styles.emptyState}>No locations found</Text>
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
                    <View style={styles.listItemStats}>
                      <Text style={styles.statText}>
                        {location.devices_count} devices • {location.active_visitors_count} active visitors
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, 
                    location.status === 'active' ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.statusText}>{location.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep('company')}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderDeviceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select or Create Device</Text>
      <Text style={styles.stepDescription}>
        Choose an existing device or register a new one
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <>
          {!isNewDevice ? (
            <>
              {devices.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyState}>No devices found for this location</Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setIsNewDevice(true)}
                  >
                    <Text style={styles.primaryButtonText}>Register New Device</Text>
                  </TouchableOpacity>
                </View>
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
                        <View style={styles.deviceStatus}>
                          <View style={[styles.statusDot, 
                            device.is_online ? styles.onlineDot : styles.offlineDot]} />
                          <Text style={styles.statusText}>
                            {device.is_online ? 'Online' : 'Offline'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setIsNewDevice(true)}
                  >
                    <Text style={styles.secondaryButtonText}>Register New Device</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.newDeviceForm}>
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
                <Text style={styles.inputHint}>
                  Use a unique identifier for this device
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={createNewDevice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Register Device</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setIsNewDevice(false)}
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
        </>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Setup</Text>
        <Text style={styles.headerSubtitle}>
          Configure this device for visitor management
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, 
            step === 'company' ? styles.activeProgressDot : styles.completedProgressDot]} />
          <Text style={styles.progressLabel}>Company</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, 
            step === 'location' ? styles.activeProgressDot : 
            step === 'device' ? styles.completedProgressDot : styles.inactiveProgressDot]} />
          <Text style={styles.progressLabel}>Location</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, 
            step === 'device' ? styles.activeProgressDot : styles.inactiveProgressDot]} />
          <Text style={styles.progressLabel}>Device</Text>
        </View>
      </View>

      {step === 'company' && renderCompanyStep()}
      {step === 'location' && renderLocationStep()}
      {step === 'device' && renderDeviceStep()}
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  activeProgressDot: {
    backgroundColor: '#2563eb',
  },
  completedProgressDot: {
    backgroundColor: '#16a34a',
  },
  inactiveProgressDot: {
    backgroundColor: '#d1d5db',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#d1d5db',
    marginHorizontal: 16,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
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
  inputHint: {
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
  listItemStats: {
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#16a34a',
  },
  offlineDot: {
    backgroundColor: '#dc2626',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    padding: 40,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 40,
  },
  newDeviceForm: {
    marginTop: 16,
  },
});

export default CompanySetup;