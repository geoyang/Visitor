import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BuildingOfficeIcon,
  MapPinIcon,
  DeviceTabletIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService, type AnalyticsSummary, type Company, type Visitor, type User } from '../services/api';

const Dashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsData, companiesData, visitorsData, usersData] = await Promise.all([
        apiService.getAnalyticsSummary(),
        apiService.getCompanies(),
        apiService.getVisitors(undefined, 10, 0),
        apiService.getUsers()
      ]);

      setAnalytics(analyticsData);
      setCompanies(companiesData);
      setRecentVisitors(visitorsData);
      setUsers(usersData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };
  const totalDevices = companies.reduce((acc, company) => acc + company.devices_count, 0);
  const totalLocations = companies.reduce((acc, company) => acc + company.locations_count, 0);
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;

  const stats = [
    {
      name: 'Total Companies',
      value: companies.length.toString(),
      change: '+12%',
      changeType: 'increase',
      icon: BuildingOfficeIcon,
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Active Users',
      value: activeUsers.toString(),
      change: totalUsers > 0 ? '+' + Math.round((activeUsers / totalUsers) * 100) + '%' : '0%',
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'from-indigo-500 to-purple-600'
    },
    {
      name: 'Active Locations',
      value: totalLocations.toString(),
      change: '+18%',
      changeType: 'increase',
      icon: MapPinIcon,
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'Connected Devices',
      value: totalDevices.toString(),
      change: '+7%',
      changeType: 'increase',
      icon: DeviceTabletIcon,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  // Generate chart data based on current analytics
  const currentMonth = new Date().getMonth();
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (currentMonth - 5 + i + 12) % 12;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Simulate historical data based on current values
    const baseVisitors = analytics?.total_visitors || 0;
    const visitors = Math.max(0, Math.floor(baseVisitors * (0.5 + Math.random() * 0.5)));
    const companiesCount = Math.min(companies.length, Math.max(1, Math.floor(companies.length * (0.3 + (i * 0.15)))));
    
    return {
      name: monthNames[monthIndex],
      visitors,
      companies: companiesCount
    };
  });

  const deviceStatusData = [
    { name: 'Online', value: Math.floor(totalDevices * 0.85), color: '#10B981' },
    { name: 'Offline', value: Math.floor(totalDevices * 0.10), color: '#EF4444' },
    { name: 'Maintenance', value: Math.floor(totalDevices * 0.05), color: '#F59E0B' },
  ];

  // Generate recent activity from actual visitor data
  const recentActivity = recentVisitors.slice(0, 4).map((visitor, index) => {
    const timeAgo = new Date(visitor.check_in_time);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timeAgo.getTime()) / (1000 * 60));
    
    let timeString = '';
    if (diffMinutes < 1) timeString = 'Just now';
    else if (diffMinutes < 60) timeString = `${diffMinutes} minutes ago`;
    else if (diffMinutes < 1440) timeString = `${Math.floor(diffMinutes / 60)} hours ago`;
    else timeString = `${Math.floor(diffMinutes / 1440)} days ago`;

    return {
      id: index + 1,
      action: visitor.status === 'checked_in' ? 'New visitor check-in' : 'Visitor checked out',
      company: visitor.full_name || 'Unknown visitor',
      time: timeString,
      type: visitor.status === 'checked_in' ? 'success' : 'info'
    };
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your platform today.</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-effect px-4 py-2 rounded-lg border border-gray-200/50"
        >
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            variants={item}
            whileHover={{ scale: 1.02, y: -5 }}
            className="glass-effect rounded-2xl p-6 border border-gray-200/50 card-hover"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className={`flex items-center text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.changeType === 'increase' ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                )}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Trends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-effect rounded-2xl p-6 border border-gray-200/50"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitor Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="visitors" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#colorVisitors)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Device Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect rounded-2xl p-6 border border-gray-200/50"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {deviceStatusData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-effect rounded-2xl p-6 border border-gray-200/50"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors duration-200"
            >
              <div className={`p-2 rounded-lg ${
                activity.type === 'success' ? 'bg-green-100' :
                activity.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                <CheckCircleIcon className={`h-5 w-5 ${
                  activity.type === 'success' ? 'text-green-600' :
                  activity.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.company}</p>
              </div>
              <div className="text-sm text-gray-400">{activity.time}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;