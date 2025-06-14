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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in email and password');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Authenticate and get token
      console.log('Authenticating with server...');
      const loginResponse = await fetch(`${serverUrl.trim()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.text();
        Alert.alert('Authentication Failed', `Failed to login: ${errorData}`);
        return;
      }

      const loginData = await loginResponse.json();
      const token = loginData.access_token;
      console.log('Authentication successful, got token');

      // Step 2: Get user info to determine company and locations
      const userResponse = await fetch(`${serverUrl.trim()}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        Alert.alert('Error', 'Failed to get user information');
        return;
      }

      const userData = await userResponse.json();
      const userCompanyId = userData.company.id;
      const companyName = userData.company.name;
      
      console.log('User company:', companyName, userCompanyId);

      // Step 3: Get available locations for this company
      const locationsResponse = await fetch(`${serverUrl.trim()}/companies/${userCompanyId}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!locationsResponse.ok) {
        Alert.alert('Error', 'Failed to get company locations');
        return;
      }

      const locations = await locationsResponse.json();
      
      if (!locations || locations.length === 0) {
        Alert.alert('Error', 'No locations found for this company. Please create a location first.');
        return;
      }

      // For now, use the first location (we can enhance this to let user choose)
      const selectedLocation = locations[0];
      const locationName = selectedLocation.name;
      const selectedLocationId = selectedLocation.id;

      console.log('Using location:', locationName, selectedLocationId);

      const config: DeviceConfig = {
        companyId: userCompanyId,
        companyName: companyName,
        locationId: selectedLocationId,
        locationName: locationName,
        deviceId: `MOBILE-${Date.now()}`,
        deviceName: 'Mobile Device',
        serverUrl: serverUrl.trim(),
        authToken: token,
        settings: {
          enableCamera: true,
          requirePhoto: true,
          enableLocation: true,
        },
      };

      onConfigComplete(config);
      Alert.alert('Success', `Device configured successfully for ${companyName} at ${locationName}!`);
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
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your admin email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={true}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔐 Authentication Required</Text>
          <Text style={styles.infoText}>
            Enter your company admin credentials to configure this device.
          </Text>
          <Text style={styles.infoText}>
            The device will receive a 30-day authentication token.
          </Text>
          <Text style={styles.infoText}>
            Your first location will be automatically selected.
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