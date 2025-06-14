import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';

interface SimpleConfigProps {
  onConfigComplete: (config: any) => void;
}

const SimpleConfig: React.FC<SimpleConfigProps> = ({ onConfigComplete }) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:8000');
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!serverUrl || !companyId || !locationId) {
      Alert.alert('Error', 'Please fill in Server URL, Company ID, and Location ID');
      return;
    }

    setLoading(true);
    try {
      // Test server connection with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      // Generate device ID if not provided
      let finalDeviceId = deviceId.trim();
      if (!finalDeviceId) {
        finalDeviceId = `MOBILE-${Date.now()}`;
      }

      // Try to create the device on the server
      try {
        const deviceData = {
          name: 'Mobile Check-in Device',
          device_type: 'mobile',
          device_id: finalDeviceId,
          status: 'active',
          settings: {
            enableCamera: true,
            requirePhoto: true,
            enableLocation: true,
            enableNotifications: true,
          },
        };

        const createResponse = await fetch(`${serverUrl}/locations/${locationId.trim()}/devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(deviceData),
        });

        if (createResponse.ok) {
          const createdDevice = await createResponse.json();
          
          const config = {
            companyId: companyId.trim(),
            companyName: createdDevice.company_name || 'Company',
            locationId: locationId.trim(),
            locationName: createdDevice.location_name || 'Location',
            deviceId: createdDevice.id,
            deviceName: createdDevice.name,
            serverUrl: serverUrl.trim(),
            settings: createdDevice.settings || {},
          };

          Alert.alert('Success', 'Device created and configured successfully!');
          onConfigComplete(config);
        } else {
          // If device creation fails, try to find existing device
          const existingResponse = await fetch(`${serverUrl}/devices?location_id=${locationId.trim()}`);
          if (existingResponse.ok) {
            const devices = await existingResponse.json();
            const device = Array.isArray(devices) ? devices[0] : devices;
            
            if (device) {
              const config = {
                companyId: companyId.trim(),
                companyName: device.company_name || 'Company',
                locationId: locationId.trim(),
                locationName: device.location_name || 'Location',
                deviceId: device.id,
                deviceName: device.name,
                serverUrl: serverUrl.trim(),
                settings: device.settings || {},
              };

              Alert.alert('Info', 'Using existing device from this location.');
              onConfigComplete(config);
            } else {
              throw new Error('No devices found at this location and failed to create new device');
            }
          } else {
            throw new Error('Failed to create device and cannot find existing devices');
          }
        }
      } catch (deviceError) {
        console.error('Device creation error:', deviceError);
        throw new Error('Failed to create or find device. Please check Company ID and Location ID.');
      }

    } catch (error) {
      console.error('Configuration error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Configuration failed. Please check your settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Setup</Text>
        <Text style={styles.subtitle}>This will create a new device and add it to your location</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:8000"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company ID</Text>
          <TextInput
            style={styles.input}
            value={companyId}
            onChangeText={setCompanyId}
            placeholder="Enter company ID"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location ID</Text>
          <TextInput
            style={styles.input}
            value={locationId}
            onChangeText={setLocationId}
            placeholder="Enter location ID"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Device ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={deviceId}
            onChangeText={setDeviceId}
            placeholder="Leave empty to auto-generate"
            autoCapitalize="none"
          />
          <Text style={styles.helpText}>
            If left empty, a unique device ID will be generated automatically
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 How to get Company ID and Location ID:</Text>
          <Text style={styles.infoText}>
            1. Open the admin dashboard in your browser
          </Text>
          <Text style={styles.infoText}>
            2. Go to Companies page and copy the company ID
          </Text>
          <Text style={styles.infoText}>
            3. Go to Locations page and copy the location ID
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create Device & Configure</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    paddingLeft: 8,
  },
});

export default SimpleConfig;