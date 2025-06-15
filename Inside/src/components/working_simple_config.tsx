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
  Dimensions,
  ScrollView,
} from 'react-native';
import { DeviceConfig } from '../contexts/SimpleDeviceConfig';

interface WorkingSimpleConfigProps {
  onConfigComplete: (config: DeviceConfig) => void;
}

// Get device dimensions for responsive design
const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isLargeTablet = screenWidth >= 1024;

const responsiveFontSize = (size: number) => {
  if (isLargeTablet) return size * 1.3;
  if (isTablet) return size * 1.1;
  return size;
};

const responsivePadding = (size: number) => {
  if (isLargeTablet) return size * 1.5;
  if (isTablet) return size * 1.2;
  return size;
};

const WorkingSimpleConfig: React.FC<WorkingSimpleConfigProps> = ({ onConfigComplete }) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:8000');
  const [linkingCode, setLinkingCode] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<'hightech' | 'lawfirm' | 'metropolitan' | 'zen'>('hightech');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!linkingCode.trim()) {
      Alert.alert('Error', 'Please enter the linking code');
      return;
    }

    setLoading(true);
    try {
      // Fetch location and company data using the linking code
      const response = await fetch(`${serverUrl.trim()}/locations/by-code/${linkingCode.trim().toUpperCase()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          Alert.alert('Error', 'Invalid linking code. Please check and try again.');
        } else {
          Alert.alert('Error', 'Failed to validate linking code. Please try again.');
        }
        return;
      }

      const data = await response.json();
      
      const config: DeviceConfig = {
        companyId: data.company_id,
        companyName: data.company_name,
        locationId: data.location_id,
        locationName: data.location_name,
        deviceId: data.device_id,
        deviceName: 'Mobile Device',
        serverUrl: serverUrl.trim(),
        deviceToken: data.device_token,
        theme: selectedTheme,
        settings: {
          enableCamera: true,
          requirePhoto: true,
          enableLocation: true,
        },
      };

      onConfigComplete(config);
      Alert.alert('Success', 'Device configured successfully!');
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
      console.error('Configuration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Setup</Text>
        <Text style={styles.subtitle}>Configure your visitor management device</Text>
      </View>

      <View style={styles.formContainer}>
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
          <Text style={styles.label}>Linking Code</Text>
          <TextInput
            style={styles.input}
            value={linkingCode}
            onChangeText={setLinkingCode}
            placeholder="Enter 5-character code (e.g. ABC23)"
            autoCapitalize="characters"
            maxLength={5}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Visual Theme</Text>
          <View style={styles.themeGrid}>
            {[
              { id: 'hightech', name: 'High Tech', emoji: '🚀', color: '#1e40af' },
              { id: 'lawfirm', name: 'Law Firm', emoji: '⚖️', color: '#7c2d12' },
              { id: 'metropolitan', name: 'Metropolitan', emoji: '🏙️', color: '#db2777' },
              { id: 'zen', name: 'Calm Zen', emoji: '🧘', color: '#059669' }
            ].map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  { backgroundColor: theme.color },
                  selectedTheme === theme.id && styles.themeCardSelected
                ]}
                onPress={() => setSelectedTheme(theme.id as any)}
              >
                <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                <Text style={styles.themeName}>{theme.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 How to get your linking code:</Text>
          <Text style={styles.infoText}>
            1. Open admin dashboard at {serverUrl.replace(':8000', ':3000')}
          </Text>
          <Text style={styles.infoText}>
            2. Go to Locations page
          </Text>
          <Text style={styles.infoText}>
            3. Find your location's 5-character linking code
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    ...(isTablet && {
      justifyContent: 'flex-start',
      alignItems: 'center',
    }),
  },
  header: {
    backgroundColor: '#2563eb',
    padding: responsivePadding(20),
    paddingTop: Platform.OS === 'ios' ? responsivePadding(50) : responsivePadding(20),
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    color: '#e0e7ff',
    textAlign: 'center',
    maxWidth: isTablet ? 600 : '100%',
    lineHeight: responsiveFontSize(22),
  },
  formContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 0,
  },
  form: {
    padding: responsivePadding(20),
    width: isTablet ? Math.min(600, screenWidth * 0.8) : '100%',
    maxWidth: 600,
  },
  inputGroup: {
    marginBottom: responsivePadding(20),
  },
  label: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: responsivePadding(12),
    fontSize: responsiveFontSize(16),
    backgroundColor: 'white',
    minHeight: isTablet ? 50 : 44,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: responsivePadding(16),
    marginBottom: responsivePadding(20),
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoTitle: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: responsiveFontSize(12),
    color: '#374151',
    marginBottom: 4,
    paddingLeft: 8,
    lineHeight: responsiveFontSize(16),
  },
  button: {
    backgroundColor: '#2563eb',
    padding: responsivePadding(16),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: responsivePadding(20),
    minHeight: isTablet ? 56 : 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  themeCard: {
    width: isTablet ? '48%' : '48%',
    aspectRatio: 1.2,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  themeEmoji: {
    fontSize: responsiveFontSize(32),
    marginBottom: 8,
  },
  themeName: {
    color: 'white',
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default WorkingSimpleConfig;