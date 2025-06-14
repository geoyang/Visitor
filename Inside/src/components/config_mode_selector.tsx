import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import EnhancedDeviceConfig from './enhanced_device_config';
import QRConfigSetup from './qr_config_setup';

const { width } = Dimensions.get('window');

interface DeviceConfig {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
  deviceId: string;
  deviceName: string;
  serverUrl: string;
  settings?: any;
}

interface ConfigModeSelectorProps {
  onConfigComplete: (config: DeviceConfig) => void;
}

type ConfigMode = 'selection' | 'manual' | 'qr';

const ConfigModeSelector: React.FC<ConfigModeSelectorProps> = ({ onConfigComplete }) => {
  const [mode, setMode] = useState<ConfigMode>('selection');

  if (mode === 'manual') {
    return (
      <EnhancedDeviceConfig 
        onConfigComplete={onConfigComplete}
      />
    );
  }

  if (mode === 'qr') {
    return (
      <QRConfigSetup 
        onConfigComplete={onConfigComplete}
        onCancel={() => setMode('selection')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Setup</Text>
        <Text style={styles.headerSubtitle}>
          Choose how you'd like to configure this device
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('qr')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodIconText}>📱</Text>
            </View>
            <Text style={styles.methodTitle}>Scan QR Code</Text>
            <Text style={styles.methodDescription}>
              Quick setup using a QR code from the admin dashboard
            </Text>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>Recommended</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('manual')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodIconText}>⚙️</Text>
            </View>
            <Text style={styles.methodTitle}>Manual Setup</Text>
            <Text style={styles.methodDescription}>
              Configure server connection and device settings manually
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • For QR code setup, get a configuration QR code from your admin dashboard
          </Text>
          <Text style={styles.helpText}>
            • For manual setup, you'll need your server URL and device credentials
          </Text>
          <Text style={styles.helpText}>
            • Contact your system administrator if you need assistance
          </Text>
        </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  methodContainer: {
    marginBottom: 40,
  },
  methodCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  methodIconText: {
    fontSize: 28,
  },
  methodTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  methodBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  helpSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default ConfigModeSelector;