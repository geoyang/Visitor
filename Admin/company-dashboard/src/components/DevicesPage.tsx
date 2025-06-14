import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  DeviceTabletIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  WifiIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiService, type Device, type Company, type Location } from '../services/api';
import EditDeviceModal from './EditDeviceModal';
import AddDeviceModal from './AddDeviceModal';
import DeleteConfirmModal from './DeleteConfirmModal';

const DevicesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [devices, setDevices] = useState<Device[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationSelectorOpen, setLocationSelectorOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [companiesData, devicesData, locationsData] = await Promise.all([
        apiService.getCompanies(),
        apiService.getDevices(),
        apiService.getLocations()
      ]);
      
      setCompanies(companiesData);
      setDevices(devicesData);
      setLocations(locationsData);
    } catch (err) {
      setError('Failed to load devices');
      console.error('Devices fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deviceTypes = ['tablet', 'desktop', 'mobile', 'kiosk'];

  const filteredDevices = devices.filter(device => {
    // Ensure all string values are defined
    const search = (searchTerm || '').toLowerCase();
    const deviceName = (device.name || '').toLowerCase();
    const deviceId = (device.device_id || '').toLowerCase();
    const companyName = (device.company_name || '').toLowerCase();
    const locationName = (device.location_name || '').toLowerCase();
    
    const matchesSearch = deviceName.includes(search) ||
                         deviceId.includes(search) ||
                         companyName.includes(search) ||
                         locationName.includes(search);
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    const matchesType = filterType === 'all' || device.device_type === filterType;
    const matchesCompany = filterCompany === 'all' || (device.company_name && device.company_name === filterCompany);
    return matchesSearch && matchesStatus && matchesType && matchesCompany;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'tablet': return DeviceTabletIcon;
      case 'desktop': return ComputerDesktopIcon;
      case 'mobile': return DevicePhoneMobileIcon;
      case 'kiosk': return DeviceTabletIcon;
      default: return DeviceTabletIcon;
    }
  };

  const getDeviceGradient = (type: string) => {
    switch (type) {
      case 'tablet': return 'from-blue-500 to-blue-600';
      case 'desktop': return 'from-purple-500 to-purple-600';
      case 'mobile': return 'from-green-500 to-green-600';
      case 'kiosk': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };


  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  const handleEditDevice = (device: Device) => {
    setSelectedDevice(device);
    setEditModalOpen(true);
  };

  const handleSaveDevice = async (updatedData: Partial<Device>) => {
    if (!selectedDevice) return;
    
    try {
      await apiService.updateDevice(selectedDevice.id, updatedData);
      await fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to update device:', error);
      throw error;
    }
  };

  const handleCreateDevice = async (deviceData: any) => {
    if (!selectedLocation) return;
    
    try {
      await apiService.createDevice(selectedLocation.id, deviceData);
      await fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to create device:', error);
      throw error;
    }
  };

  const handleAddDevice = () => {
    if (locations.length === 0) {
      alert('Please create a location first before adding devices.');
      return;
    }
    
    if (locations.length === 1) {
      // Only one location, use it directly
      setSelectedLocation(locations[0]);
      setAddModalOpen(true);
    } else {
      // Multiple locations, show selector
      setLocationSelectorOpen(true);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setLocationSelectorOpen(false);
    setAddModalOpen(true);
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    
    setActionLoading(true);
    try {
      await apiService.deleteDevice(selectedDevice.id);
      await fetchData(); // Refresh the list
      setSelectedDevice(null);
    } catch (error) {
      console.error('Failed to delete device:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (device: Device) => {
    setSelectedDevice(device);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading devices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load devices</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all connected devices</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddDevice}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Device
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-effect rounded-2xl p-6 border border-gray-200/50"
      >
        <div className="flex flex-col xl:flex-row xl:items-center space-y-4 xl:space-y-0 xl:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200/50 rounded-xl leading-5 bg-white/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200/50 rounded-xl px-3 py-2.5 bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-200/50 rounded-xl px-3 py-2.5 bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            >
              <option value="all">All Types</option>
              {deviceTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>

            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="border border-gray-200/50 rounded-xl px-3 py-2.5 bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.name}>{company.name}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Devices Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredDevices.map((device, index) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass-effect rounded-2xl p-6 border border-gray-200/50 card-hover group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getDeviceGradient(device.device_type)} rounded-xl flex items-center justify-center`}>
                      <DeviceIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {device.name}
                      </h3>
                      <p className="text-sm text-gray-500">{device.device_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {device.is_online ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <WifiIcon className={`h-4 w-4 ${device.is_online ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <button className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Status and Location */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                    <span className="text-xs text-gray-500">{device.device_type}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <BuildingOfficeIcon className="h-3 w-3" />
                      <span>{device.company_name || 'Unknown Company'}</span>
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <MapPinIcon className="h-3 w-3" />
                      <span>{device.location_name || 'Unknown Location'}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-1">
                      <UserGroupIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">0</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-1">
                      <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">0</p>
                    <p className="text-xs text-gray-500">Check-ins</p>
                  </div>
                </div>

                {/* Device Details */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Last seen:</span>
                    <span className="text-gray-700">{getTimeAgo(device.last_heartbeat)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-700">{getTimeAgo(device.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${device.is_online ? 'text-green-600' : 'text-red-600'}`}>
                      {device.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Device Type */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Device Type:</p>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200/50 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEditDevice(device)}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openDeleteModal(device)}
                    className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <DeviceTabletIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first device.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddDevice}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Device
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      <EditDeviceModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        device={selectedDevice}
        onSave={handleSaveDevice}
      />

      <AddDeviceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        locationId={selectedLocation?.id || ''}
        locationName={selectedLocation?.name || ''}
        onSave={handleCreateDevice}
      />

      {/* Location Selector Modal */}
      <AnimatePresence>
        {locationSelectorOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
                onClick={() => setLocationSelectorOpen(false)}
              />

              <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle z-[10000]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Location
                  </h3>
                  <button
                    onClick={() => setLocationSelectorOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Choose which location to add the device to:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{location.name}</div>
                      <div className="text-sm text-gray-500">{location.address}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Company: {location.company_name || 'Unknown'}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setLocationSelectorOpen(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteDevice}
        title="Delete Device"
        message={`Are you sure you want to delete ${selectedDevice?.name}? This action cannot be undone.`}
        confirmText="Delete Device"
        loading={actionLoading}
      />
    </div>
  );
};

export default DevicesPage;