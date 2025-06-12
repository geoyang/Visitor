// VisitorHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const VisitorHistoryScreen = () => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    loadVisitors();
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [searchQuery, filter, visitors]);

  const loadVisitors = async () => {
    console.log("loading visitors")
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/visitors?limit=100`);
      const data = await response.json();
      setVisitors(data);
    } catch (error) {
      console.error('Error loading visitors:', error);
      Alert.alert('Error', 'Failed to load visitor history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterVisitors = () => {
    let filtered = visitors;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(visitor => visitor.status === filter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(visitor =>
        visitor.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visitor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visitor.host_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVisitors(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVisitors();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked_in': return '#16a34a';
      case 'checked_out': return '#6b7280';
      case 'expired': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const renderVisitorItem = ({ item }) => (
    <View style={styles.visitorItem}>
      <View style={styles.visitorHeader}>
        <View style={styles.visitorInfo}>
          <Text style={styles.visitorName}>{item.full_name}</Text>
          <Text style={styles.visitorCompany}>{item.company}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.visitorDetails}>
        <Text style={styles.detailText}>Host: {item.host_name}</Text>
        <Text style={styles.detailText}>Purpose: {item.visit_purpose}</Text>
        <Text style={styles.detailText}>Check-in: {formatDate(item.check_in_time)}</Text>
        {item.check_out_time && (
          <Text style={styles.detailText}>Check-out: {formatDate(item.check_out_time)}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitors..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {['all', 'checked_in', 'checked_out'].map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              filter === filterOption && styles.activeFilterButton,
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === filterOption && styles.activeFilterButtonText,
              ]}
            >
              {filterOption === 'all' ? 'All' : filterOption.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Visitor List */}
      <FlatList
        data={filteredVisitors}
        renderItem={renderVisitorItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// SettingsScreen.js
const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    autoCheckout: true,
    checkoutTime: 8, // hours
    enableNotifications: true,
    requirePhoto: false,
    enableSignature: false,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Save to backend/storage
  };

  const renderSettingItem = (title, key, type = 'switch', options = []) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      {type === 'switch' && (
        <Switch
          value={settings[key]}
          onValueChange={(value) => updateSetting(key, value)}
        />
      )}
      {type === 'select' && (
        <View style={styles.selectContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.selectOption,
                settings[key] === option.value && styles.selectedOption,
              ]}
              onPress={() => updateSetting(key, option.value)}
            >
              <Text style={styles.selectOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        {renderSettingItem('Auto Check-out', 'autoCheckout')}
        {renderSettingItem('Check-out Time (hours)', 'checkoutTime', 'select', [
          { value: 4, label: '4 hours' },
          { value: 8, label: '8 hours' },
          { value: 12, label: '12 hours' },
          { value: 24, label: '24 hours' },
        ])}
        {renderSettingItem('Enable Notifications', 'enableNotifications')}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visitor Requirements</Text>
        {renderSettingItem('Require Photo', 'requirePhoto')}
        {renderSettingItem('Enable Signature', 'enableSignature')}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Visitor Management App v1.0.0</Text>
        <Text style={styles.aboutText}>Built with React Native and FastAPI</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // History Screen Styles
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeFilterButton: {
    backgroundColor: '#2563eb',
  },
  filterButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  visitorItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  visitorCompany: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  visitorDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },

  // Settings Screen Styles
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingTitle: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: '#2563eb',
  },
  selectOptionText: {
    color: '#374151',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  dangerButtonText: {
    color: 'white',
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
});

export { VisitorHistoryScreen, SettingsScreen };