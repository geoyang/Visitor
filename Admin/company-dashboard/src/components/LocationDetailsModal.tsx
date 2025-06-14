import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  MapPinIcon,
  DeviceTabletIcon,
  UserGroupIcon,
  ClockIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  SignalIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { apiService, type Location } from '../services/api';

interface Visitor {
  id: string;
  form_id: string;
  data: {
    first_name?: string;
    last_name?: string;
    company?: string;
    host_name?: string;
    purpose?: string;
    phone?: string;
    email?: string;
  };
  check_in_time: string;
  check_out_time?: string;
  status: string;
  notes?: string;
}

interface Device {
  id: string;
  company_id: string;
  location_id: string;
  name: string;
  device_type: string;
  device_id: string;
  status: string;
  is_online: boolean;
  last_heartbeat?: string;
  created_at?: string;
}

interface User {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  last_login?: string;
  created_at: string;
}

interface LocationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  isOpen,
  onClose,
  location
}) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'visitors' | 'devices'>('details');

  useEffect(() => {
    if (isOpen && location) {
      fetchData();
    }
  }, [isOpen, location]);

  const fetchData = async () => {
    if (!location) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [allVisitors, allDevices, allUsers] = await Promise.all([
        apiService.getVisitors(),
        apiService.getDevices(),
        apiService.getUsers()
      ]);

      // Filter visitors by location_id
      const locationVisitors = allVisitors.filter(visitor => 
        visitor.data?.location_id === location.id
      );
      
      // Filter devices by location_id
      const locationDevices = allDevices.filter(device => 
        device.location_id === location.id
      );
      
      // Filter users by company_id (users are associated with companies, not specific locations)
      const locationUsers = allUsers.filter(user => 
        user.company_id === location.company_id && user.status === 'active'
      );

      setVisitors(locationVisitors);
      setDevices(locationDevices);
      setUsers(locationUsers);
    } catch (err) {
      setError('Failed to load data');
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tablet': return DeviceTabletIcon;
      case 'desktop': return ComputerDesktopIcon;
      case 'mobile': return DevicePhoneMobileIcon;
      case 'kiosk': return DeviceTabletIcon;
      default: return DeviceTabletIcon;
    }
  };

  const getDeviceStatusColor = (status: string, isOnline: boolean) => {
    if (!isOnline) return 'bg-red-100 text-red-800';
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLastSeen = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return 'Never';
    const now = new Date();
    const heartbeat = new Date(lastHeartbeat);
    const diffMinutes = Math.floor((now.getTime() - heartbeat.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const currentVisitors = visitors.filter(visitor => visitor.status === 'checked_in');
  const todayVisitors = visitors.filter(visitor => {
    const checkInDate = new Date(visitor.check_in_time);
    const today = new Date();
    return checkInDate.toDateString() === today.toDateString();
  });

  if (!location) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={onClose}
            />

            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6 z-[10000] relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <MapPinIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{location.name}</h3>
                    <p className="text-gray-600">{location.company_name || 'Unknown Company'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-100 rounded-xl p-1">
                {[
                  { id: 'details', label: 'Details', icon: BuildingOfficeIcon },
                  { id: 'visitors', label: 'Current Visitors', icon: UserGroupIcon },
                  { id: 'devices', label: 'Devices & Users', icon: DeviceTabletIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 mr-2" />
                    {tab.label}
                    {tab.id === 'visitors' && currentVisitors.length > 0 && (
                      <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                        {currentVisitors.length}
                      </span>
                    )}
                    {tab.id === 'devices' && devices.length > 0 && (
                      <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                        {devices.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-96">
                {activeTab === 'details' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <DeviceTabletIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{location.devices_count}</p>
                        <p className="text-sm text-blue-600">Devices</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <UserGroupIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{currentVisitors.length}</p>
                        <p className="text-sm text-green-600">Current Visitors</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4 text-center">
                        <CalendarDaysIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{todayVisitors.length}</p>
                        <p className="text-sm text-purple-600">Today's Visitors</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 text-center">
                        <ClockIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">
                          {location.status === 'active' ? 'Active' : 'Inactive'}
                        </p>
                        <p className="text-sm text-orange-600">Status</p>
                      </div>
                    </div>

                    {/* Location Details */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Location Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-start space-x-3 mb-4">
                            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Address</p>
                              <p className="text-sm text-gray-600">{location.address}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Company</p>
                              <p className="text-sm text-gray-600">{location.company_name || 'Unknown'}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-start space-x-3 mb-4">
                            <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Status</p>
                              <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                                location.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : location.status === 'maintenance'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {location.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'visitors' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading visitors...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">{error}</p>
                        <button
                          onClick={fetchData}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : currentVisitors.length === 0 ? (
                      <div className="text-center py-12">
                        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No current visitors</h3>
                        <p className="text-gray-600">No visitors are currently checked in at this location.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Current Visitors ({currentVisitors.length})
                        </h4>
                        {currentVisitors.map((visitor) => {
                          const checkInTime = formatDateTime(visitor.check_in_time);
                          return (
                            <div
                              key={visitor.id}
                              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                      <span className="text-white font-medium text-sm">
                                        {(visitor.data?.first_name || 'U').charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <h5 className="font-semibold text-gray-900">
                                        {visitor.data?.first_name || ''} {visitor.data?.last_name || ''}
                                      </h5>
                                      <p className="text-sm text-gray-600">{visitor.data?.company || 'Walk-in'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {visitor.data?.host_name && (
                                      <div>
                                        <span className="font-medium text-gray-700">Host: </span>
                                        <span className="text-gray-600">{visitor.data.host_name}</span>
                                      </div>
                                    )}
                                    {visitor.data?.purpose && (
                                      <div>
                                        <span className="font-medium text-gray-700">Purpose: </span>
                                        <span className="text-gray-600">{visitor.data.purpose}</span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium text-gray-700">Check-in: </span>
                                      <span className="text-gray-600">{checkInTime.date} at {checkInTime.time}</span>
                                    </div>
                                    {visitor.data?.email && (
                                      <div className="flex items-center space-x-1">
                                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-600">{visitor.data.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="ml-4">
                                  <span className="inline-flex px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800">
                                    Checked In
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'devices' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading devices and users...</p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">{error}</p>
                        <button
                          onClick={fetchData}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Devices Section */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <DeviceTabletIcon className="h-5 w-5 mr-2" />
                            Devices ({devices.length})
                          </h4>
                          {devices.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                              <DeviceTabletIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600">No devices found for this location</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {devices.map((device) => {
                                const DeviceIcon = getDeviceIcon(device.device_type);
                                return (
                                  <div
                                    key={device.id}
                                    className="bg-white border border-gray-200 rounded-xl p-4"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <DeviceIcon className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <h5 className="font-medium text-gray-900">{device.name}</h5>
                                          <p className="text-sm text-gray-500 capitalize">{device.device_type}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {device.is_online ? (
                                          <WifiIcon className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <SignalIcon className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getDeviceStatusColor(device.status, device.is_online)}`}>
                                          {device.is_online ? 'Online' : 'Offline'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Device ID:</span>
                                        <span className="font-mono text-gray-900">{device.device_id}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className="capitalize text-gray-900">{device.status}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Last Seen:</span>
                                        <span className="text-gray-900">{getLastSeen(device.last_heartbeat)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Users Section */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                            <UserIcon className="h-5 w-5 mr-2" />
                            Active Users ({users.length})
                          </h4>
                          {users.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                              <UserIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600">No active users found for this company</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {users.map((user) => (
                                <div
                                  key={user.id}
                                  className="bg-white border border-gray-200 rounded-xl p-4"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                      <span className="text-purple-600 font-medium text-sm">
                                        {user.first_name.charAt(0).toUpperCase()}{user.last_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="font-medium text-gray-900">
                                        {user.first_name} {user.last_name}
                                      </h5>
                                      <p className="text-sm text-gray-600 flex items-center space-x-1">
                                        <EnvelopeIcon className="h-4 w-4" />
                                        <span>{user.email}</span>
                                      </p>
                                      <div className="flex items-center justify-between mt-2">
                                        <span className="inline-flex px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                          {user.role}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {user.last_login ? `Last login: ${formatDateTime(user.last_login).date}` : 'Never logged in'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LocationDetailsModal;