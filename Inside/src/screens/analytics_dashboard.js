import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
} from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const chartWidth = isTablet ? width * 0.45 : width - 32;

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [analyticsData, setAnalyticsData] = useState(null);

  const API_BASE = 'http://localhost:8000'; // Replace with your API URL

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load summary data
      const summaryResponse = await fetch(`${API_BASE}/analytics/summary`);
      const summaryData = await summaryResponse.json();

      // Load visitor trends
      const trendsResponse = await fetch(`${API_BASE}/analytics/trends?period=${selectedPeriod}`);
      const trendsData = await trendsResponse.json();

      // Load visitor types
      const typesResponse = await fetch(`${API_BASE}/analytics/visitor-types?period=${selectedPeriod}`);
      const typesData = await typesResponse.json();

      // Load peak hours
      const peakHoursResponse = await fetch(`${API_BASE}/analytics/peak-hours?period=${selectedPeriod}`);
      const peakHoursData = await peakHoursResponse.json();

      // Load host analytics
      const hostResponse = await fetch(`${API_BASE}/analytics/hosts?period=${selectedPeriod}`);
      const hostData = await hostResponse.json();

      setAnalyticsData({
        summary: summaryData,
        trends: trendsData,
        visitorTypes: typesData,
        peakHours: peakHoursData,
        hosts: hostData,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Use mock data for demo
      setAnalyticsData(getMockData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const getMockData = () => ({
    summary: {
      total_visitors: 1247,
      active_visitors: 8,
      today_visitors: 23,
      avg_visit_duration: '2h 15m',
      popular_visit_purpose: 'Meeting',
      busiest_hour: '2:00 PM',
    },
    trends: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [12, 19, 15, 25, 22, 8, 6],
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 3,
      }],
    },
    visitorTypes: [
      { name: 'Meetings', count: 156, color: '#2563eb', legendFontColor: '#374151' },
      { name: 'Interviews', count: 89, color: '#16a34a', legendFontColor: '#374151' },
      { name: 'Deliveries', count: 67, color: '#dc2626', legendFontColor: '#374151' },
      { name: 'Maintenance', count: 34, color: '#f59e0b', legendFontColor: '#374151' },
      { name: 'Other', count: 28, color: '#8b5cf6', legendFontColor: '#374151' },
    ],
    peakHours: {
      labels: ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM'],
      datasets: [{
        data: [5, 15, 28, 35, 22, 8],
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      }],
    },
    hosts: [
      { name: 'John Smith', visitors: 23, department: 'Sales' },
      { name: 'Sarah Johnson', visitors: 18, department: 'HR' },
      { name: 'Mike Chen', visitors: 15, department: 'Engineering' },
      { name: 'Lisa Brown', visitors: 12, department: 'Marketing' },
      { name: 'David Wilson', visitors: 10, department: 'Operations' },
    ],
  });

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2563eb',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  };

  const renderSummaryCard = (title, value, subtitle, color = '#2563eb') => (
    <View style={[styles.summaryCard, isTablet && styles.tabletSummaryCard]}>
      <View style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Text style={styles.summaryIconText}>{title.charAt(0)}</Text>
      </View>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
        {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.selectedPeriodButton,
            ]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.selectedPeriodButtonText,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderChart = (title, children, fullWidth = false) => (
    <View style={[
      styles.chartContainer,
      isTablet && !fullWidth && styles.tabletChartContainer,
      fullWidth && styles.fullWidthChart,
    ]}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );

  if (loading && !analyticsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Track visitor patterns and insights
        </Text>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Summary Cards */}
      <View style={[styles.summaryContainer, isTablet && styles.tabletSummaryContainer]}>
        {renderSummaryCard('Total Visitors', analyticsData.summary.total_visitors, 'All time', '#2563eb')}
        {renderSummaryCard('Active Now', analyticsData.summary.active_visitors, 'Currently checked in', '#16a34a')}
        {renderSummaryCard('Today', analyticsData.summary.today_visitors, 'Visitors today', '#f59e0b')}
        {renderSummaryCard('Avg Duration', analyticsData.summary.avg_visit_duration, 'Per visit', '#8b5cf6')}
      </View>

      {/* Charts Container */}
      <View style={isTablet ? styles.tabletChartsContainer : styles.mobileChartsContainer}>
        
        {/* Visitor Trends */}
        {renderChart(
          'Visitor Trends',
          <LineChart
            data={analyticsData.trends}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        )}

        {/* Peak Hours */}
        {renderChart(
          'Peak Hours',
          <AreaChart
            data={analyticsData.peakHours}
            width={chartWidth}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            }}
            style={styles.chart}
          />
        )}

        {/* Visitor Types - Full Width */}
        {renderChart(
          'Visit Purposes',
          <PieChart
            data={analyticsData.visitorTypes}
            width={isTablet ? width - 64 : width - 32}
            height={220}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />,
          true
        )}

        {/* Top Hosts */}
        {renderChart(
          'Top Hosts',
          <View style={styles.hostsList}>
            {analyticsData.hosts.map((host, index) => (
              <View key={index} style={styles.hostItem}>
                <View style={styles.hostInfo}>
                  <View style={styles.hostAvatar}>
                    <Text style={styles.hostAvatarText}>
                      {host.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.hostDetails}>
                    <Text style={styles.hostName}>{host.name}</Text>
                    <Text style={styles.hostDepartment}>{host.department}</Text>
                  </View>
                </View>
                <View style={styles.hostStats}>
                  <Text style={styles.hostVisitorCount}>{host.visitors}</Text>
                  <Text style={styles.hostVisitorLabel}>visitors</Text>
                </View>
              </View>
            ))}
          </View>,
          true
        )}

      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Quick Insights</Text>
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatLabel}>Most Popular Visit Type</Text>
            <Text style={styles.quickStatValue}>{analyticsData.summary.popular_visit_purpose}</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatLabel}>Busiest Hour</Text>
            <Text style={styles.quickStatValue}>{analyticsData.summary.busiest_hour}</Text>
          </View>
        </View>
      </View>

      {/* Export Button */}
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  periodSelector: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  periodButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedPeriodButton: {
    backgroundColor: '#2563eb',
  },
  periodButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  selectedPeriodButtonText: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  tabletSummaryContainer: {
    paddingHorizontal: 32,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: isTablet ? '48%' : '48%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabletSummaryCard: {
    width: '23%',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryIconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },
  mobileChartsContainer: {
    padding: 16,
  },
  tabletChartsContainer: {
    padding: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabletChartContainer: {
    width: '48%',
  },
  fullWidthChart: {
    width: '100%',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  hostsList: {
    flex: 1,
  },
  hostItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostAvatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  hostDepartment: {
    fontSize: 14,
    color: '#6b7280',
  },
  hostStats: {
    alignItems: 'flex-end',
  },
  hostVisitorCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  hostVisitorLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickStatsContainer: {
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
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  exportContainer: {
    padding: 16,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AnalyticsDashboard;