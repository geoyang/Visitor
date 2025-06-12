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
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Animated } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const VisitorHistoryScreen = () => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    loadVisitors();
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [searchQuery, filter, visitors]);

  const loadVisitors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/visitors?limit=100`);
      const data = await response.json();
      
      // Mock data for demonstration if API fails
      if (!response.ok) {
        const mockData = generateMockVisitors();
        setVisitors(mockData);
        return;
      }
      
      setVisitors(data);
    } catch (error) {
      console.error('Error loading visitors:', error);
      // Use mock data for demo
      const mockData = generateMockVisitors();
      setVisitors(mockData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockVisitors = () => [
    {
      id: '1',
      form_id: 'visitor_form_v1',
      status: 'checked_in',
      check_in_time: new Date().toISOString(),
      check_out_time: null,
      data: {
        full_name: 'John Smith',
        company: 'Tech Corp Inc.',
        email: 'john.smith@techcorp.com',
        phone: '+1-555-0123',
        visit_purpose: 'Meeting',
        host_name: 'Sarah Johnson',
        department: 'Engineering',
        badge_number: 'B001',
        notes: 'Meeting about new project collaboration',
        emergency_contact: 'Jane Smith - +1-555-0124',
        vehicle_info: {
          make: 'Toyota',
          model: 'Camry',
          license_plate: 'ABC123',
          color: 'Blue'
        },
        additional_requirements: ['Wheelchair Access', 'Escort Required'],
        previous_visits: 3,
        security_clearance: 'Level 2'
      }
    },
    {
      id: '2',
      form_id: 'visitor_form_v1',
      status: 'checked_out',
      check_in_time: new Date(Date.now() - 3600000).toISOString(),
      check_out_time: new Date().toISOString(),
      data: {
        full_name: 'Maria Rodriguez',
        company: 'Design Studio LLC',
        email: 'maria.r@designstudio.com',
        phone: '+1-555-0456',
        visit_purpose: 'Interview',
        host_name: 'Mike Chen',
        department: 'HR',
        badge_number: 'B002',
        notes: 'UX Designer position interview',
        emergency_contact: 'Carlos Rodriguez - +1-555-0457',
        interview_type: 'Final Round',
        position_applied: 'Senior UX Designer',
        portfolio_url: 'https://maria-portfolio.com',
        expected_duration: '2 hours'
      }
    },
    {
      id: '3',
      form_id: 'delivery_form_v1', 
      status: 'checked_out',
      check_in_time: new Date(Date.now() - 7200000).toISOString(),
      check_out_time: new Date(Date.now() - 3600000).toISOString(),
      data: {
        full_name: 'David Wilson',
        company: 'Express Delivery',
        email: 'david.wilson@expressdelivery.com',
        phone: '+1-555-0789',
        visit_purpose: 'Delivery',
        host_name: 'Reception',
        delivery_type: 'Office Supplies',
        tracking_number: 'EXP123456789',
        recipient_department: 'Operations',
        package_count: 3,
        package_weight: '15 lbs',
        signature_required: true,
        delivery_notes: 'Fragile items - handle with care'
      }
    }
  ];

  const filterVisitors = () => {
    let filtered = visitors;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(visitor => visitor.status === filter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(visitor => {
        const data = visitor.data || {};
        return (
          data.full_name?.toLowerCase().includes(query) ||
          data.company?.toLowerCase().includes(query) ||
          data.host_name?.toLowerCase().includes(query) ||
          data.email?.toLowerCase().includes(query) ||
          data.visit_purpose?.toLowerCase().includes(query)
        );
      });
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

  const formatDuration = (checkIn, checkOut) => {
    if (!checkOut) return 'Still checked in';
    
    const duration = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked_in': return '#16a34a';
      case 'checked_out': return '#6b7280';
      case 'expired': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked_in': return '✓';
      case 'checked_out': return '→';
      case 'expired': return '⚠';
      default: return '?';
    }
  };

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const openDetailModal = (visitor) => {
    setSelectedVisitor(visitor);
    setModalVisible(true);
  };

  const renderFormData = (data, isModal = false) => {
    if (!data || typeof data !== 'object') return null;

    const containerStyle = isModal ? styles.modalDataContainer : styles.dataContainer;
    const labelStyle = isModal ? styles.modalDataLabel : styles.dataLabel;
    const valueStyle = isModal ? styles.modalDataValue : styles.dataValue;

    return (
      <View style={containerStyle}>
        {Object.entries(data).map(([key, value]) => {
          if (value === null || value === undefined || value === '') return null;
          
          return (
            <View key={key} style={styles.dataRow}>
              <Text style={labelStyle}>
                {formatFieldName(key)}:
              </Text>
              <Text style={valueStyle}>
                {formatFieldValue(value)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFieldValue = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const renderVisitorItem = ({ item }) => {
    const isExpanded = expandedItems.has(item.id);
    const data = item.data || {};

    return (
      <View style={styles.visitorItem}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.visitorHeader}
          onPress={() => toggleExpanded(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.visitorMainInfo}>
            <View style={styles.visitorNameSection}>
              <Text style={styles.visitorName}>{data.full_name || 'Unknown Visitor'}</Text>
              <Text style={styles.visitorCompany}>{data.company || 'No Company'}</Text>
            </View>
            <View style={styles.visitorMetaInfo}>
              <Text style={styles.visitPurpose}>{data.visit_purpose || 'General Visit'}</Text>
              <Text style={styles.hostName}>Host: {data.host_name || 'N/A'}</Text>
            </View>
          </View>
          
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
              <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Check-in:</Text>
            <Text style={styles.timeValue}>{formatDate(item.check_in_time)}</Text>
          </View>
          {item.check_out_time && (
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Check-out:</Text>
              <Text style={styles.timeValue}>{formatDate(item.check_out_time)}</Text>
            </View>
          )}
          <View style={styles.durationInfo}>
            <Text style={styles.durationLabel}>Duration:</Text>
            <Text style={styles.durationValue}>
              {formatDuration(item.check_in_time, item.check_out_time)}
            </Text>
          </View>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>Visitor Details</Text>
              <TouchableOpacity 
                style={styles.viewFullButton}
                onPress={() => openDetailModal(item)}
              >
                <Text style={styles.viewFullButtonText}>View Full Details</Text>
              </TouchableOpacity>
            </View>
            
            {/* Key Details Preview */}
            <View style={styles.keyDetails}>
              {data.email && (
                <View style={styles.keyDetailItem}>
                  <Text style={styles.keyDetailLabel}>Email:</Text>
                  <Text style={styles.keyDetailValue}>{data.email}</Text>
                </View>
              )}
              {data.phone && (
                <View style={styles.keyDetailItem}>
                  <Text style={styles.keyDetailLabel}>Phone:</Text>
                  <Text style={styles.keyDetailValue}>{data.phone}</Text>
                </View>
              )}
              {data.badge_number && (
                <View style={styles.keyDetailItem}>
                  <Text style={styles.keyDetailLabel}>Badge:</Text>
                  <Text style={styles.keyDetailValue}>{data.badge_number}</Text>
                </View>
              )}
              {data.notes && (
                <View style={styles.keyDetailItem}>
                  <Text style={styles.keyDetailLabel}>Notes:</Text>
                  <Text style={styles.keyDetailValue}>{data.notes}</Text>
                </View>
              )}
            </View>

            {/* Form Data Preview */}
            <View style={styles.formDataPreview}>
              <Text style={styles.formDataTitle}>Form Data ({item.form_id})</Text>
              {renderFormData(data)}
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedVisitor) return null;

    const data = selectedVisitor.data || {};

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
          
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleSection}>
                <Text style={styles.modalTitle}>{data.full_name || 'Visitor Details'}</Text>
                <Text style={styles.modalSubtitle}>{data.company || 'No Company'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Status and Time Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Visit Information</Text>
                <View style={styles.modalStatusRow}>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedVisitor.status) }]}>
                    <Text style={styles.modalStatusText}>
                      {getStatusIcon(selectedVisitor.status)} {selectedVisitor.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.modalFormId}>Form: {selectedVisitor.form_id}</Text>
                </View>
                
                <View style={styles.modalTimeSection}>
                  <View style={styles.modalTimeItem}>
                    <Text style={styles.modalTimeLabel}>Check-in Time</Text>
                    <Text style={styles.modalTimeValue}>{formatDate(selectedVisitor.check_in_time)}</Text>
                  </View>
                  {selectedVisitor.check_out_time && (
                    <View style={styles.modalTimeItem}>
                      <Text style={styles.modalTimeLabel}>Check-out Time</Text>
                      <Text style={styles.modalTimeValue}>{formatDate(selectedVisitor.check_out_time)}</Text>
                    </View>
                  )}
                  <View style={styles.modalTimeItem}>
                    <Text style={styles.modalTimeLabel}>Duration</Text>
                    <Text style={styles.modalTimeValue}>
                      {formatDuration(selectedVisitor.check_in_time, selectedVisitor.check_out_time)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Complete Form Data */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Complete Form Data</Text>
                {renderFormData(data, true)}
              </View>

              {/* Raw JSON (for developers) */}
              <View style={styles.modalSection}>
                <TouchableOpacity 
                  style={styles.jsonToggleButton}
                  onPress={() => {
                    // You could implement JSON view toggle here
                    Alert.alert('Raw JSON', JSON.stringify(selectedVisitor, null, 2));
                  }}
                >
                  <Text style={styles.jsonToggleText}>View Raw JSON Data</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitors, companies, hosts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All', count: visitors.length },
          { key: 'checked_in', label: 'Active', count: visitors.filter(v => v.status === 'checked_in').length },
          { key: 'checked_out', label: 'Completed', count: visitors.filter(v => v.status === 'checked_out').length }
        ].map((filterOption) => (
          <TouchableOpacity
            key={filterOption.key}
            style={[
              styles.filterButton,
              filter === filterOption.key && styles.activeFilterButton,
            ]}
            onPress={() => setFilter(filterOption.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === filterOption.key && styles.activeFilterButtonText,
              ]}
            >
              {filterOption.label} ({filterOption.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredVisitors.length} visitor{filteredVisitors.length !== 1 ? 's' : ''} found
        </Text>
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Detail Modal */}
      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Search and Filter Styles
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
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
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: 'white',
  },
  summaryContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  // List Styles
  listContainer: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  visitorItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  
  // Header Styles
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  visitorMainInfo: {
    flex: 1,
  },
  visitorNameSection: {
    marginBottom: 8,
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
  visitorMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitPurpose: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  hostName: {
    fontSize: 14,
    color: '#374151',
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  statusIcon: {
    color: 'white',
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Quick Info Styles
  quickInfo: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 13,
    color: '#374151',
  },
  durationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  durationLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  durationValue: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },

  // Expanded Content Styles
  expandedContent: {
    padding: 16,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewFullButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewFullButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  keyDetails: {
    marginBottom: 16,
  },
  keyDetailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  keyDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 80,
  },
  keyDetailValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  formDataPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  formDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  // Data Display Styles
  dataContainer: {
    marginTop: 8,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    width: 100,
  },
  dataValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitleSection: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalStatusText: {
    color: 'white',
    fontWeight: '600',
  },
  modalFormId: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  modalTimeSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  modalTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTimeLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalTimeValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  modalDataContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  modalDataLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    width: 120,
  },
  modalDataValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  jsonToggleButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  jsonToggleText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default VisitorHistoryScreen;