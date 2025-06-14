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
import { DeviceConfig } from '../contexts/SimpleDeviceConfig';

interface WorkingSimpleConfigProps {
  onConfigComplete: (config: DeviceConfig) => void;
}

const WorkingSimpleConfig: React.FC<WorkingSimpleConfigProps> = ({ onConfigComplete }) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:8000');
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!companyId.trim() || !locationId.trim()) {
      Alert.alert('Error', 'Please fill in Company ID and Location ID');
      return;
    }

    setLoading(true);
    try {
      const config: DeviceConfig = {
        companyId: companyId.trim(),
        companyName: 'Configured Company',
        locationId: locationId.trim(),
        locationName: 'Configured Location',
        deviceId: `MOBILE-${Date.now()}`,
        deviceName: 'Mobile Device',
        serverUrl: serverUrl.trim(),
        settings: {
          enableCamera: true,
          requirePhoto: true,
          enableLocation: true,
        },
      };

      onConfigComplete(config);
      Alert.alert('Success', 'Device configured successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Setup</Text>
        <Text style={styles.subtitle}>Configure your visitor management device</Text>
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

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 How to get IDs:</Text>
          <Text style={styles.infoText}>
            1. Open admin dashboard at {serverUrl.replace(':8000', ':3000')}
          </Text>
          <Text style={styles.infoText}>
            2. Copy Company ID from Companies page
          </Text>
          <Text style={styles.infoText}>
            3. Copy Location ID from Locations page
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
            <Text style={styles.buttonText}>Configure Device</Text>
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
});

export default WorkingSimpleConfig;