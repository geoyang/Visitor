import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
// Removing Expo vector icons temporarily to fix font loading issues
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';

const Tab = createBottomTabNavigator();

// Simple Visitor Check-in Screen
function CheckInScreen() {
  const [visitorName, setVisitorName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hostName, setHostName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { config } = useSimpleDeviceConfig();

  const handleCheckIn = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Error', 'Please enter visitor name');
      return;
    }

    if (!config) {
      Alert.alert('Error', 'Device not configured');
      return;
    }

    setIsLoading(true);
    try {
      const visitorData = {
        form_id: "default",
        data: {
          first_name: visitorName.split(' ')[0] || visitorName,
          last_name: visitorName.split(' ').slice(1).join(' ') || '',
          company: companyName.trim() || 'Walk-in',
          host_name: hostName.trim(),
          purpose: purpose.trim(),
          device_id: config.deviceId,
          location_id: config.locationId,
          company_id: config.companyId,
        },
        check_in_time: new Date().toISOString(),
        status: "checked_in"
      };

      const response = await fetch(`${config.serverUrl}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitorData),
      });

      if (response.ok) {
        Alert.alert(
          'Check-in Successful',
          `Welcome ${visitorName}! You have been checked in.`,
          [{ text: 'OK', onPress: () => clearForm() }]
        );
      } else {
        const errorData = await response.text();
        Alert.alert('Error', `Failed to check in: ${errorData}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during check-in');
      console.error('Check-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setVisitorName('');
    setCompanyName('');
    setHostName('');
    setPurpose('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visitor Check-in</Text>
        <Text style={styles.subtitle}>Welcome! Please fill in your details</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={visitorName}
            onChangeText={setVisitorName}
            placeholder="Enter your full name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Your company name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Host Name</Text>
          <TextInput
            style={styles.input}
            value={hostName}
            onChangeText={setHostName}
            placeholder="Who are you visiting?"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Purpose of Visit</Text>
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Meeting, delivery, etc."
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity 
          style={[styles.checkInButton, isLoading && styles.buttonDisabled]} 
          onPress={handleCheckIn}
          disabled={isLoading}
        >
          <Text style={styles.checkInButtonText}>
            {isLoading ? 'Checking In...' : 'Check In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
          <Text style={styles.clearButtonText}>Clear Form</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Simple History Screen
function HistoryScreen() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { config } = useSimpleDeviceConfig();

  useEffect(() => {
    fetchVisitors();
  }, [config]);

  const fetchVisitors = async () => {
    if (!config) return;

    try {
      setLoading(true);
      const response = await fetch(`${config.serverUrl}/visitors`);
      if (response.ok) {
        const data = await response.json();
        setVisitors(data);
      } else {
        console.error('Failed to fetch visitors');
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading visitors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visitor History</Text>
        <Text style={styles.subtitle}>Recent visitor activity</Text>
      </View>

      <ScrollView style={styles.historyList}>
        {visitors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No visitors yet</Text>
            <Text style={styles.emptySubtext}>Visitors will appear here after checking in</Text>
          </View>
        ) : (
          visitors.map((visitor) => (
            <View key={visitor.id} style={styles.visitorCard}>
              <View style={styles.visitorInfo}>
                <Text style={styles.visitorName}>
                  {visitor.data?.first_name || ''} {visitor.data?.last_name || ''}
                </Text>
                <Text style={styles.visitorCompany}>{visitor.data?.company || 'Unknown'}</Text>
                <Text style={styles.visitorTime}>
                  {formatDate(visitor.check_in_time)} at {formatTime(visitor.check_in_time)}
                </Text>
                {visitor.data?.purpose && (
                  <Text style={styles.visitorPurpose}>{visitor.data.purpose}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, 
                visitor.check_out_time ? styles.checkedOutBadge : styles.checkedInBadge]}>
                <Text style={styles.statusText}>
                  {visitor.check_out_time ? 'Checked Out' : 'Checked In'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Simple Analytics Screen
function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState({
    todayVisitors: 0,
    checkedIn: 0,
    monthlyTotal: 0,
    checkoutRate: 0
  });
  const [loading, setLoading] = useState(true);
  const { config } = useSimpleDeviceConfig();

  useEffect(() => {
    fetchAnalytics();
  }, [config]);

  const fetchAnalytics = async () => {
    if (!config) return;

    try {
      setLoading(true);
      // Fetch visitors to calculate analytics
      const response = await fetch(`${config.serverUrl}/visitors`);
      if (response.ok) {
        const visitors = await response.json();
        calculateAnalytics(visitors);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (visitors) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayVisitors = visitors.filter(v => 
      new Date(v.check_in_time) >= startOfToday
    ).length;

    const checkedIn = visitors.filter(v => 
      !v.check_out_time
    ).length;

    const monthlyTotal = visitors.filter(v => 
      new Date(v.check_in_time) >= startOfMonth
    ).length;

    const checkedOutCount = visitors.filter(v => v.check_out_time).length;
    const checkoutRate = visitors.length > 0 ? Math.round((checkedOutCount / visitors.length) * 100) : 0;

    setAnalytics({
      todayVisitors,
      checkedIn,
      monthlyTotal,
      checkoutRate
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Visitor statistics</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{analytics.todayVisitors}</Text>
          <Text style={styles.statLabel}>Today's Visitors</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{analytics.checkedIn}</Text>
          <Text style={styles.statLabel}>Currently Checked In</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{analytics.monthlyTotal}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{analytics.checkoutRate}%</Text>
          <Text style={styles.statLabel}>Check-out Rate</Text>
        </View>
      </View>
    </View>
  );
}

// Simple Settings Screen
function SettingsScreen() {
  const { config, clearConfig } = useSimpleDeviceConfig();

  const handleReset = () => {
    Alert.alert(
      'Reset Configuration',
      'Are you sure you want to reset the device configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          try {
            await clearConfig();
            Alert.alert('Success', 'Configuration reset successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to reset configuration');
          }
        }},
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Device configuration</Text>
      </View>

      <View style={styles.settingsContainer}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Device ID</Text>
          <Text style={styles.settingValue}>{config?.deviceId || 'Not configured'}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Company ID</Text>
          <Text style={styles.settingValue}>{config?.companyId || 'Not configured'}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Location ID</Text>
          <Text style={styles.settingValue}>{config?.locationId || 'Not configured'}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Server URL</Text>
          <Text style={styles.settingValue}>{config?.serverUrl || 'Not configured'}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Status</Text>
          <Text style={[styles.settingValue, styles.activeStatus]}>Active</Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset Configuration</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Tab Icon Component with Custom Shapes
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const iconColor = focused ? '#2563eb' : '#6b7280';
  
  const renderIcon = () => {
    switch (name) {
      case 'Check-in':
        return (
          <View style={styles.iconContainer}>
            {/* Person icon */}
            <View style={[styles.personHead, { backgroundColor: iconColor }]} />
            <View style={[styles.personBody, { backgroundColor: iconColor }]} />
            {/* Plus sign */}
            <View style={[styles.plusVertical, { backgroundColor: iconColor }]} />
            <View style={[styles.plusHorizontal, { backgroundColor: iconColor }]} />
          </View>
        );
      case 'History':
        return (
          <View style={styles.iconContainer}>
            {/* List lines */}
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 4 }]} />
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 9 }]} />
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 14 }]} />
            <View style={[styles.listLine, { backgroundColor: iconColor, top: 19 }]} />
          </View>
        );
      case 'Analytics':
        return (
          <View style={styles.iconContainer}>
            {/* Bar chart */}
            <View style={[styles.barChart1, { backgroundColor: iconColor }]} />
            <View style={[styles.barChart2, { backgroundColor: iconColor }]} />
            <View style={[styles.barChart3, { backgroundColor: iconColor }]} />
            <View style={[styles.barChart4, { backgroundColor: iconColor }]} />
          </View>
        );
      case 'Settings':
        return (
          <View style={styles.iconContainer}>
            {/* Gear shape */}
            <View style={[styles.gearCenter, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth1, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth2, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth3, { backgroundColor: iconColor }]} />
            <View style={[styles.gearTooth4, { backgroundColor: iconColor }]} />
          </View>
        );
      default:
        return <View style={[styles.defaultIcon, { backgroundColor: iconColor }]} />;
    }
  };

  return (
    <View style={styles.tabIconWrapper}>
      {renderIcon()}
    </View>
  );
};

// Main Visitor App Component
export default function SimpleVisitorApp() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: Platform.OS === 'ios' ? 20 : 5,
            height: Platform.OS === 'ios' ? 85 : 65,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen
          name="Check-in"
          component={CheckInScreen}
          options={{
            title: 'Visitor Check-in',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            title: 'Visitor History',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            title: 'Analytics',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerShown: false,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

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
  checkInButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  historyList: {
    padding: 20,
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  visitorCompany: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  visitorTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  checkedInBadge: {
    backgroundColor: '#d1fae5',
  },
  checkedOutBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  statsContainer: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  settingsContainer: {
    padding: 20,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeStatus: {
    color: '#16a34a',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  visitorPurpose: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Tab Icon Styles
  tabIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  
  // Check-in Icon (Person + Plus)
  personHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 2,
    left: 4,
  },
  personBody: {
    width: 8,
    height: 10,
    borderRadius: 4,
    position: 'absolute',
    top: 9,
    left: 3,
  },
  plusVertical: {
    width: 2,
    height: 8,
    position: 'absolute',
    top: 4,
    right: 3,
  },
  plusHorizontal: {
    width: 8,
    height: 2,
    position: 'absolute',
    top: 7,
    right: 0,
  },
  
  // History Icon (List)
  listLine: {
    width: 16,
    height: 2,
    position: 'absolute',
    left: 4,
    borderRadius: 1,
  },
  
  // Analytics Icon (Bar Chart)
  barChart1: {
    width: 3,
    height: 12,
    position: 'absolute',
    bottom: 2,
    left: 2,
  },
  barChart2: {
    width: 3,
    height: 16,
    position: 'absolute',
    bottom: 2,
    left: 6,
  },
  barChart3: {
    width: 3,
    height: 8,
    position: 'absolute',
    bottom: 2,
    left: 10,
  },
  barChart4: {
    width: 3,
    height: 14,
    position: 'absolute',
    bottom: 2,
    left: 14,
  },
  
  // Settings Icon (Gear)
  gearCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    left: 8,
  },
  gearTooth1: {
    width: 2,
    height: 4,
    position: 'absolute',
    top: 2,
    left: 11,
  },
  gearTooth2: {
    width: 4,
    height: 2,
    position: 'absolute',
    top: 11,
    left: 18,
  },
  gearTooth3: {
    width: 2,
    height: 4,
    position: 'absolute',
    top: 18,
    left: 11,
  },
  gearTooth4: {
    width: 4,
    height: 2,
    position: 'absolute',
    top: 11,
    left: 2,
  },
  
  // Default Icon
  defaultIcon: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});