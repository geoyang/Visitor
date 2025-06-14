import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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

interface QRConfigSetupProps {
  onConfigComplete: (config: DeviceConfig) => void;
  onCancel: () => void;
}

const QRConfigSetup: React.FC<QRConfigSetupProps> = ({ onConfigComplete, onCancel }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setLoading(true);

    try {
      // Parse QR code data
      const configData = JSON.parse(data);
      
      // Validate required fields
      if (!configData.companyId || !configData.locationId || !configData.serverUrl) {
        throw new Error('Invalid QR code format');
      }

      // Test server connection
      const response = await fetch(`${configData.serverUrl}/health`);
      if (!response.ok) {
        throw new Error('Cannot connect to server');
      }

      // Verify the configuration by fetching device info
      const deviceResponse = await fetch(`${configData.serverUrl}/devices/${configData.deviceId}`);
      if (!deviceResponse.ok) {
        throw new Error('Device not found on server');
      }

      const deviceInfo = await deviceResponse.json();

      const finalConfig: DeviceConfig = {
        companyId: configData.companyId,
        companyName: configData.companyName || deviceInfo.company_name || 'Unknown Company',
        locationId: configData.locationId,
        locationName: configData.locationName || deviceInfo.location_name || 'Unknown Location',
        deviceId: configData.deviceId,
        deviceName: configData.deviceName || deviceInfo.name || 'Unknown Device',
        serverUrl: configData.serverUrl,
        settings: configData.settings || {},
      };

      // Save configuration
      await AsyncStorage.setItem('device_config', JSON.stringify(finalConfig));

      Alert.alert(
        'Configuration Complete',
        `Device configured successfully!\n\nCompany: ${finalConfig.companyName}\nLocation: ${finalConfig.locationName}\nDevice: ${finalConfig.deviceName}`,
        [
          {
            text: 'Continue',
            onPress: () => onConfigComplete(finalConfig),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Configuration Error',
        error instanceof Error ? error.message : 'Invalid QR code or network error',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            },
          },
          {
            text: 'Cancel',
            onPress: onCancel,
            style: 'cancel',
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSampleQR = () => {
    const sampleConfig = {
      companyId: "your-company-id",
      companyName: "Your Company Name",
      locationId: "your-location-id", 
      locationName: "Main Office",
      deviceId: "your-device-id",
      deviceName: "Reception Tablet",
      serverUrl: "http://your-server.com:8000",
      settings: {
        enableCamera: true,
        requirePhoto: true,
        autoPrintBadges: false
      }
    };

    Alert.alert(
      'Sample QR Code Data',
      `Here's what your QR code should contain:\n\n${JSON.stringify(sampleConfig, null, 2)}`,
      [{ text: 'OK' }]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Camera Permission Required</Text>
          <Text style={styles.description}>
            Camera access is needed to scan the configuration QR code.
          </Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onCancel}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Configuration QR Code</Text>
        <Text style={styles.headerSubtitle}>
          Point your camera at the QR code from the admin dashboard
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
          }}
          onCameraReady={() => setCameraReady(true)}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.scanCorner} />
              <View style={[styles.scanCorner, styles.topRight]} />
              <View style={[styles.scanCorner, styles.bottomLeft]} />
              <View style={[styles.scanCorner, styles.bottomRight]} />
            </View>
            
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.loadingOverlayText}>Configuring device...</Text>
              </View>
            )}
          </View>
        </Camera>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          {scanned 
            ? 'Processing configuration...' 
            : cameraReady 
              ? 'Align QR code within the frame above'
              : 'Preparing camera...'
          }
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={generateSampleQR}
          >
            <Text style={styles.helpButtonText}>QR Format Help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {scanned && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setScanned(false);
              setLoading(false);
            }}
          >
            <Text style={styles.retryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    textAlign: 'center',
    marginTop: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#2563eb',
    borderWidth: 3,
    borderTopLeftRadius: 4,
    top: 0,
    left: 0,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    transform: [{ rotate: '90deg' }],
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    transform: [{ rotate: '270deg' }],
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    transform: [{ rotate: '180deg' }],
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  helpButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  helpButtonText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default QRConfigSetup;