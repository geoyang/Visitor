import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { CustomTheme } from '../types/theme';

interface ThemePreviewProps {
  theme: CustomTheme;
  compact?: boolean;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, compact = false }) => {
  const mockData = {
    companyName: 'Acme Corporation',
    welcomeMessage: theme.layoutConfig.welcomeMessage || 'Welcome to our office!',
    currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    currentDate: new Date().toLocaleDateString(),
    location: 'Main Office - Floor 2',
  };

  if (compact) {
    return (
      <View style={[styles.compactPreview, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.compactHeader, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.compactHeaderText, { color: theme.colors.headerText }]}>
            Preview
          </Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: theme.colors.text }]}>
            {mockData.companyName}
          </Text>
          <TouchableOpacity 
            style={[styles.compactButton, { backgroundColor: theme.colors.buttonBackground }]}
          >
            <Text style={[styles.compactButtonText, { color: theme.colors.buttonText }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.preview, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        {theme.layoutConfig.showLogo && (
          <View style={styles.logoContainer}>
            {theme.images.logo ? (
              <Image source={{ uri: theme.images.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { borderColor: theme.colors.headerText }]}>
                <Text style={[styles.logoText, { color: theme.colors.headerText }]}>LOGO</Text>
              </View>
            )}
          </View>
        )}
        
        {theme.layoutConfig.showCompanyName && (
          <Text style={[
            styles.companyName, 
            { 
              color: theme.colors.headerText,
              fontSize: theme.fonts.sizes.xl,
              fontWeight: theme.fonts.weights.bold as any,
            }
          ]}>
            {mockData.companyName}
          </Text>
        )}

        {theme.layoutConfig.showDateTime && (
          <View style={styles.dateTimeContainer}>
            <Text style={[styles.time, { color: theme.colors.headerText }]}>
              {mockData.currentTime}
            </Text>
            <Text style={[styles.date, { color: theme.colors.headerText }]}>
              {mockData.currentDate}
            </Text>
          </View>
        )}
      </View>

      {/* Welcome Section */}
      <View style={[styles.welcomeSection, { backgroundColor: theme.colors.surface }]}>
        {theme.layoutConfig.showWelcomeMessage && (
          <Text style={[
            styles.welcomeMessage,
            {
              color: theme.colors.text,
              fontSize: theme.fonts.sizes.lg,
              fontWeight: theme.fonts.weights.medium as any,
            }
          ]}>
            {mockData.welcomeMessage}
          </Text>
        )}

        {theme.layoutConfig.showLocationInfo && (
          <Text style={[
            styles.locationInfo,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.fonts.sizes.md,
            }
          ]}>
            📍 {mockData.location}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[
            styles.primaryButton, 
            { 
              backgroundColor: theme.colors.buttonBackground,
              borderRadius: theme.borderRadius.md,
            }
          ]}
        >
          <Text style={[
            styles.primaryButtonText,
            {
              color: theme.colors.buttonText,
              fontSize: theme.fonts.sizes.md,
              fontWeight: theme.fonts.weights.semibold as any,
            }
          ]}>
            Sign In as Visitor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.secondaryButton,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.md,
            }
          ]}
        >
          <Text style={[
            styles.secondaryButtonText,
            {
              color: theme.colors.text,
              fontSize: theme.fonts.sizes.md,
            }
          ]}>
            I'm an Employee
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Preview */}
      <View style={[styles.formSection, { backgroundColor: theme.colors.surface }]}>
        <Text style={[
          styles.formTitle,
          {
            color: theme.colors.text,
            fontSize: theme.fonts.sizes.lg,
            fontWeight: theme.fonts.weights.semibold as any,
          }
        ]}>
          Visitor Information
        </Text>

        <View style={[styles.inputGroup, { borderColor: theme.colors.border }]}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Full Name
          </Text>
          <Text style={[styles.inputPlaceholder, { color: theme.colors.text }]}>
            John Doe
          </Text>
        </View>

        <View style={[styles.inputGroup, { borderColor: theme.colors.border }]}>
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
            Company
          </Text>
          <Text style={[styles.inputPlaceholder, { color: theme.colors.text }]}>
            Example Corp
          </Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.submitButton,
            {
              backgroundColor: theme.colors.success,
              borderRadius: theme.borderRadius.md,
            }
          ]}
        >
          <Text style={[styles.submitButtonText, { color: 'white' }]}>
            Complete Check-in
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Examples */}
      <View style={styles.statusSection}>
        <View style={[styles.statusItem, { backgroundColor: theme.colors.success }]}>
          <Text style={styles.statusText}>✓ Success</Text>
        </View>
        <View style={[styles.statusItem, { backgroundColor: theme.colors.warning }]}>
          <Text style={styles.statusText}>⚠ Warning</Text>
        </View>
        <View style={[styles.statusItem, { backgroundColor: theme.colors.error }]}>
          <Text style={styles.statusText}>✕ Error</Text>
        </View>
        <View style={[styles.statusItem, { backgroundColor: theme.colors.info }]}>
          <Text style={styles.statusText}>ⓘ Info</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Compact preview styles
  compactPreview: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compactHeader: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Full preview styles
  preview: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  companyName: {
    textAlign: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    alignItems: 'center',
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    marginTop: 2,
  },
  welcomeSection: {
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  welcomeMessage: {
    textAlign: 'center',
    marginBottom: 8,
  },
  locationInfo: {
    textAlign: 'center',
  },
  actionSection: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    textAlign: 'center',
  },
  formSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  formTitle: {
    marginBottom: 16,
  },
  inputGroup: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  inputPlaceholder: {
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  statusItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ThemePreview;