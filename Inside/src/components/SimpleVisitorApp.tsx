import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
// Removing Expo vector icons temporarily to fix font loading issues
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ThemeType } from '../themes/themes';
import ThemeBackground from './ThemeBackground';

const Tab = createBottomTabNavigator();

// Get device dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768; // iPad and larger tablets
const isLargeTablet = screenWidth >= 1024; // iPad Pro and larger

// Responsive helper functions
const responsiveWidth = (percentage: number) => {
  if (isLargeTablet) {
    // On large tablets, limit max width for better UX
    return Math.min(screenWidth * (percentage / 100), screenWidth * 0.6);
  }
  return screenWidth * (percentage / 100);
};

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

// Welcome Screen with Image Selection
function WelcomeScreen({ onStartCheckIn, onOpenSettings }: { 
  onStartCheckIn: () => void;
  onOpenSettings?: () => void;
}) {
  const { config } = useSimpleDeviceConfig();
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (onOpenSettings) {
      // Start a subtle pulse animation for the settings icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulseAnim, onOpenSettings]);

  const handleImageSelect = () => {
    onStartCheckIn();
  };

  const handleSettingsPress = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  const dynamicStyles = createDynamicStyles(theme);

  return (
    <ThemeBackground theme={theme} style={{ flex: 1 }}>
      {/* Settings Icon */}
      {onOpenSettings && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={styles.settingsIcon} 
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <View style={styles.settingsGearContainer}>
              {/* Settings gear icon */}
              <View style={[styles.settingsGear, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]} />
              <View style={[styles.settingsTooth1, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]} />
              <View style={[styles.settingsTooth2, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]} />
              <View style={[styles.settingsTooth3, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]} />
              <View style={[styles.settingsTooth4, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      <View style={styles.welcomeContent}>
        {/* Welcome Message */}
        <View style={styles.welcomeMessageContainer}>
          <Text style={[
            dynamicStyles.welcomeTitle, 
            { 
              fontFamily: theme.fonts.primary,
              fontWeight: theme.fonts.weights.bold,
              color: 'white'
            }
          ]}>
            Welcome to {config?.companyName || 'Our Company'}
          </Text>
          {config?.locationName && (
            <Text style={[
              dynamicStyles.welcomeSubtitle,
              {
                fontFamily: theme.fonts.secondary,
                fontWeight: theme.fonts.weights.regular,
                color: 'rgba(255, 255, 255, 0.9)'
              }
            ]}>
              {config.locationName}
            </Text>
          )}
          <Text style={[
            dynamicStyles.welcomeInstruction,
            {
              fontFamily: theme.fonts.secondary,
              fontWeight: theme.fonts.weights.regular,
              color: 'rgba(255, 255, 255, 0.8)'
            }
          ]}>
            Please select an option to continue
          </Text>
        </View>

        {/* Welcome Cards */}
        <View style={styles.welcomeCardsContainer}>
          <View style={styles.imageGrid}>
            {theme.welcomeImages.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={[
                  dynamicStyles.imageCard, 
                  { backgroundColor: image.color },
                  theme.shadow.medium
                ]}
                onPress={handleImageSelect}
                activeOpacity={0.8}
              >
                <Text style={[
                  dynamicStyles.imageEmoji,
                  { fontFamily: theme.fonts.primary }
                ]}>{image.emoji}</Text>
                <Text style={[
                  dynamicStyles.imageName,
                  { 
                    fontFamily: theme.fonts.primary,
                    fontWeight: theme.fonts.weights.bold
                  }
                ]}>{image.name}</Text>
                <Text style={[
                  dynamicStyles.imageDescription,
                  { 
                    fontFamily: theme.fonts.secondary,
                    fontWeight: theme.fonts.weights.regular
                  }
                ]}>{image.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ThemeBackground>
  );
}

// Simple Visitor Check-in Screen
function CheckInScreen({ onBackToWelcome }: { onBackToWelcome?: () => void }) {
  const [visitorName, setVisitorName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hostName, setHostName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { config } = useSimpleDeviceConfig();
  const { theme } = useTheme();
  
  // Workflow execution hook would be added here in production
  // const { executeWorkflowsForTrigger } = useWorkflowExecution();

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
        location_id: config.locationId,
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add device token if available
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/device/visitors`, {
        method: 'POST',
        headers,
        body: JSON.stringify(visitorData),
      });

      if (response.ok) {
        Alert.alert(
          'Check-in Successful',
          `Welcome ${visitorName}! You have been checked in.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              clearForm();
              if (onBackToWelcome) {
                onBackToWelcome();
              }
            }
          }]
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        {onBackToWelcome && (
          <TouchableOpacity style={styles.backButton} onPress={onBackToWelcome}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: 'white' }]}>Visitor Check-in</Text>
        <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
          Welcome to {config?.companyName || 'our company'}
          {config?.locationName ? ` at ${config.locationName}` : ''}!
          {'\n'}Please fill in your details
        </Text>
      </View>

      <View style={styles.formContainer}>
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
          style={[
            styles.checkInButton, 
            { backgroundColor: theme.colors.success },
            isLoading && styles.buttonDisabled
          ]} 
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
      </View>
    </ScrollView>
  );
}

// Simple History Screen
function HistoryScreen() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const { config } = useSimpleDeviceConfig();

  useEffect(() => {
    fetchVisitors();
  }, [config]);

  const fetchVisitors = async () => {
    if (!config) return;

    try {
      setLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add device token if available
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/device/visitors`, { headers });
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

  const handleCheckout = async (visitorId: string, visitorName: string) => {
    if (!config) return;

    Alert.alert(
      'Checkout Visitor',
      `Are you sure you want to check out ${visitorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Checkout', 
          onPress: async () => {
            try {
              setCheckingOut(visitorId);
              
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };

              // Add device token if available
              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }

              const response = await fetch(`${config.serverUrl}/device/visitors/${visitorId}/checkout`, {
                method: 'POST',
                headers,
              });

              if (response.ok) {
                Alert.alert('Success', `${visitorName} has been checked out successfully.`);
                // Refresh the visitor list
                await fetchVisitors();
              } else {
                const errorData = await response.text();
                Alert.alert('Error', `Failed to checkout visitor: ${errorData}`);
              }
            } catch (error) {
              Alert.alert('Error', 'Network error during checkout');
              console.error('Checkout error:', error);
            } finally {
              setCheckingOut(null);
            }
          }
        },
      ]
    );
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
              <View style={styles.visitorActions}>
                <View style={[styles.statusBadge, 
                  visitor.check_out_time ? styles.checkedOutBadge : styles.checkedInBadge]}>
                  <Text style={styles.statusText}>
                    {visitor.check_out_time ? 'Checked Out' : 'Checked In'}
                  </Text>
                </View>
                
                {!visitor.check_out_time && (
                  <TouchableOpacity
                    style={[styles.checkoutButton, checkingOut === visitor.id && styles.buttonDisabled]}
                    onPress={() => handleCheckout(visitor.id, `${visitor.data?.first_name || ''} ${visitor.data?.last_name || ''}`.trim())}
                    disabled={checkingOut === visitor.id}
                  >
                    {checkingOut === visitor.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.checkoutButtonText}>Check Out</Text>
                    )}
                  </TouchableOpacity>
                )}
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
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add device token if available
      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      // Fetch visitors to calculate analytics
      const response = await fetch(`${config.serverUrl}/device/visitors`, { headers });
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
  const { config, clearConfig, refreshConfig, updateTheme } = useSimpleDeviceConfig();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [changingTheme, setChangingTheme] = useState(false);

  const handleThemeChange = async (newTheme: 'hightech' | 'lawfirm' | 'metropolitan' | 'zen') => {
    try {
      setChangingTheme(true);
      await updateTheme(newTheme);
      Alert.alert('Success', 'Theme updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update theme');
    } finally {
      setChangingTheme(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshConfig();
      Alert.alert('Success', 'Configuration refreshed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh configuration');
    } finally {
      setRefreshing(false);
    }
  };

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

  const themeOptions = [
    { id: 'hightech', name: 'High Tech', emoji: '🚀', color: '#1e40af' },
    { id: 'lawfirm', name: 'Law Firm', emoji: '⚖️', color: '#7c2d12' },
    { id: 'metropolitan', name: 'Metropolitan', emoji: '🏙️', color: '#db2777' },
    { id: 'zen', name: 'Calm Zen', emoji: '🧘', color: '#059669' }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <Text style={[styles.title, { color: 'white' }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>Device configuration</Text>
      </View>

      <View style={styles.settingsContainer}>
        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Device ID</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.deviceId || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Company Name</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.companyName || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Location Name</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.locationName || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Server URL</Text>
          <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{config?.serverUrl || 'Not configured'}</Text>
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Status</Text>
          <Text style={[styles.settingValue, { color: theme.colors.success }]}>Active</Text>
        </View>

        {/* Theme Selection Section */}
        <View style={[styles.settingSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Visual Theme</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Choose your preferred appearance</Text>
          
          <View style={styles.themeGrid}>
            {themeOptions.map((themeOption) => (
              <TouchableOpacity
                key={themeOption.id}
                style={[
                  styles.themeCard,
                  { backgroundColor: themeOption.color },
                  config?.theme === themeOption.id && styles.themeCardSelected,
                  theme.shadow.small
                ]}
                onPress={() => handleThemeChange(themeOption.id as any)}
                disabled={changingTheme}
              >
                <Text style={styles.themeEmoji}>{themeOption.emoji}</Text>
                <Text style={styles.themeName}>{themeOption.name}</Text>
                {config?.theme === themeOption.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.resetButton, styles.refreshButton, { backgroundColor: theme.colors.primary }]} 
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.resetButtonText}>Refresh Configuration</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.resetButton, { backgroundColor: theme.colors.error }]} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset Configuration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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

// Main Visitor App Component with Welcome Screen
function MainAppTabs({ onBackToWelcome }: { onBackToWelcome: () => void }) {
  return (
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
          options={{
            title: 'Visitor Check-in',
            headerShown: false,
          }}
        >
          {() => <CheckInScreen onBackToWelcome={onBackToWelcome} />}
        </Tab.Screen>
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
  );
}

// Main Visitor App Component
export default function SimpleVisitorApp() {
  const { config } = useSimpleDeviceConfig();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSettingsFromWelcome, setShowSettingsFromWelcome] = useState(false);

  const handleStartCheckIn = () => {
    setShowWelcome(false);
    setShowSettingsFromWelcome(false);
  };

  const handleBackToWelcome = () => {
    setShowWelcome(true);
    setShowSettingsFromWelcome(false);
  };

  const handleOpenSettings = () => {
    setShowWelcome(false);
    setShowSettingsFromWelcome(true);
  };

  const selectedTheme: ThemeType = config?.theme || 'hightech';

  return (
    <ThemeProvider themeType={selectedTheme}>
      <ThemedApp 
        showWelcome={showWelcome}
        showSettingsFromWelcome={showSettingsFromWelcome}
        onStartCheckIn={handleStartCheckIn}
        onBackToWelcome={handleBackToWelcome}
        onOpenSettings={handleOpenSettings}
      />
    </ThemeProvider>
  );
}

// Themed App Component
function ThemedApp({ 
  showWelcome, 
  showSettingsFromWelcome,
  onStartCheckIn, 
  onBackToWelcome,
  onOpenSettings
}: {
  showWelcome: boolean;
  showSettingsFromWelcome: boolean;
  onStartCheckIn: () => void;
  onBackToWelcome: () => void;
  onOpenSettings: () => void;
}) {
  if (showWelcome) {
    return <WelcomeScreen onStartCheckIn={onStartCheckIn} onOpenSettings={onOpenSettings} />;
  }

  if (showSettingsFromWelcome) {
    return (
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Settings"
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
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Check-in"
            options={{
              title: 'Visitor Check-in',
              headerShown: false,
            }}
          >
            {() => <CheckInScreen onBackToWelcome={onBackToWelcome} />}
          </Tab.Screen>
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
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainAppTabs onBackToWelcome={onBackToWelcome} />
    </NavigationContainer>
  );
}

// Dynamic styles that change based on theme
const createDynamicStyles = (theme: any) => StyleSheet.create({
  welcomeTitle: {
    fontSize: responsiveFontSize(isTablet ? 42 : 32),
    textAlign: 'center',
    marginBottom: responsivePadding(8),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: responsiveFontSize(isTablet ? 24 : 20),
    textAlign: 'center',
    marginBottom: responsivePadding(16),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  welcomeInstruction: {
    fontSize: responsiveFontSize(isTablet ? 18 : 16),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageCard: {
    width: isLargeTablet ? '30%' : isTablet ? '45%' : '48%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.large,
    marginBottom: responsivePadding(16),
    marginHorizontal: isLargeTablet ? '1.5%' : 0,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: isTablet ? 160 : 140,
  },
  imageEmoji: {
    fontSize: responsiveFontSize(48),
    marginBottom: responsivePadding(12),
  },
  imageName: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    marginBottom: responsivePadding(8),
    textAlign: 'center',
  },
  imageDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: responsiveFontSize(12),
    textAlign: 'center',
    paddingHorizontal: responsivePadding(8),
    lineHeight: responsiveFontSize(16),
  },
});

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
  checkInButton: {
    backgroundColor: '#16a34a',
    padding: responsivePadding(16),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: responsivePadding(20),
    marginBottom: 10,
    minHeight: isTablet ? 56 : 48,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#6b7280',
    padding: responsivePadding(12),
    borderRadius: 8,
    alignItems: 'center',
    minHeight: isTablet ? 48 : 40,
  },
  clearButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    top: responsivePadding(20),
    left: responsivePadding(20),
    zIndex: 1,
  },
  backButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsivePadding(20),
  },
  welcomeMessageContainer: {
    alignItems: 'center',
    marginBottom: responsivePadding(40),
    paddingHorizontal: responsivePadding(20),
  },
  welcomeCardsContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    maxWidth: isTablet ? 800 : '100%',
  },
  welcomeContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 20,
    paddingVertical: responsivePadding(20),
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isLargeTablet ? 'center' : 'space-between',
    maxWidth: isTablet ? 900 : '100%',
    width: '100%',
  },
  historyList: {
    padding: responsivePadding(20),
    width: '100%',
    maxWidth: isTablet ? 800 : '100%',
    alignSelf: 'center',
  },
  visitorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(16),
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 80 : 60,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  visitorCompany: {
    fontSize: responsiveFontSize(14),
    color: '#6b7280',
    marginTop: 2,
  },
  visitorTime: {
    fontSize: responsiveFontSize(12),
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
  visitorActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: isTablet ? 120 : 100,
  },
  checkoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(8),
    borderRadius: 6,
    marginTop: 8,
    minHeight: isTablet ? 36 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: isTablet ? 80 : 70,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
  statsContainer: {
    padding: responsivePadding(20),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isLargeTablet ? 'center' : 'space-between',
    maxWidth: isTablet ? 900 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(20),
    width: isLargeTablet ? '22%' : isTablet ? '45%' : '48%',
    marginBottom: 16,
    marginHorizontal: isLargeTablet ? '1.5%' : 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: isTablet ? 120 : 100,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: responsiveFontSize(32),
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: responsiveFontSize(14),
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: responsiveFontSize(18),
  },
  settingsContainer: {
    padding: responsivePadding(20),
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(16),
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: isTablet ? 70 : 60,
  },
  settingLabel: {
    fontSize: responsiveFontSize(16),
    color: '#374151',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: responsiveFontSize(16),
    color: '#6b7280',
  },
  activeStatus: {
    color: '#16a34a',
    fontWeight: '600',
  },
  settingSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: responsivePadding(20),
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: responsiveFontSize(14),
    marginBottom: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: isTablet ? '48%' : '48%',
    aspectRatio: 1.5,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  themeCardSelected: {
    borderColor: '#ffffff',
  },
  themeEmoji: {
    fontSize: responsiveFontSize(28),
    marginBottom: 6,
  },
  themeName: {
    color: 'white',
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: responsiveFontSize(14),
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#dc2626',
    padding: responsivePadding(16),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: responsivePadding(20),
    minHeight: isTablet ? 56 : 48,
    justifyContent: 'center',
  },
  refreshButton: {
    backgroundColor: '#2563eb',
    marginTop: 10,
  },
  resetButtonText: {
    color: 'white',
    fontSize: responsiveFontSize(16),
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
  
  // Welcome Screen Settings Icon
  settingsIcon: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? responsivePadding(50) : responsivePadding(30),
    right: responsivePadding(20),
    width: responsivePadding(50),
    height: responsivePadding(50),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: responsivePadding(25),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  settingsGearContainer: {
    width: responsivePadding(24),
    height: responsivePadding(24),
    position: 'relative',
  },
  settingsGear: {
    width: responsivePadding(12),
    height: responsivePadding(12),
    borderRadius: responsivePadding(6),
    position: 'absolute',
    top: responsivePadding(6),
    left: responsivePadding(6),
  },
  settingsTooth1: {
    width: responsivePadding(3),
    height: responsivePadding(6),
    position: 'absolute',
    top: 0,
    left: responsivePadding(10.5),
  },
  settingsTooth2: {
    width: responsivePadding(6),
    height: responsivePadding(3),
    position: 'absolute',
    top: responsivePadding(10.5),
    right: 0,
  },
  settingsTooth3: {
    width: responsivePadding(3),
    height: responsivePadding(6),
    position: 'absolute',
    bottom: 0,
    left: responsivePadding(10.5),
  },
  settingsTooth4: {
    width: responsivePadding(6),
    height: responsivePadding(3),
    position: 'absolute',
    top: responsivePadding(10.5),
    left: 0,
  },
});