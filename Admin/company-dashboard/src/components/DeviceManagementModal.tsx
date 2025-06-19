import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  DeviceTabletIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon as CloseIcon,
  PowerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiService, type Device, type Location } from '../services/api';

interface DeviceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

const DeviceManagementModal: React.FC<DeviceManagementModalProps> = ({
  isOpen,
  onClose,
  location
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && location) {
      fetchDevices();
    }
  }, [isOpen, location]);

  const fetchDevices = async () => {
    if (!location) return;
    
    try {
      setLoading(true);
      console.log('Fetching devices for location:', location.id);
      const deviceList = await apiService.getDevices(location.id);
      console.log('Devices received:', deviceList);
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (deviceId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      setActionLoading(deviceId);
      await apiService.updateDevice(deviceId, { name: newName.trim() });
      await fetchDevices();
      setEditingDevice(null);
      setEditName('');
    } catch (error) {
      console.error('Failed to rename device:', error);
      alert('Failed to rename device');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (deviceId: string) => {
    try {
      setActionLoading(deviceId);
      await apiService.deleteDevice(deviceId);
      await fetchDevices();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete device:', error);
      alert('Failed to delete device');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (deviceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      setActionLoading(deviceId);
      await apiService.updateDevice(deviceId, { status: newStatus });
      await fetchDevices();
    } catch (error) {
      console.error('Failed to update device status:', error);
      alert('Failed to update device status');
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (device: Device) => {
    setEditingDevice(device.id);
    setEditName(device.name);
  };

  const cancelEdit = () => {
    setEditingDevice(null);
    setEditName('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'tablet':
      case 'kiosk':
      case 'desktop':
      case 'mobile':
      default:
        return <DeviceTabletIcon className="h-5 w-5" />;
    }
  };

  if (!isOpen || !location) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Device Management</h2>
                <p className="text-blue-100">{location.name} - {devices.length} devices</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading devices...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-12">
                <DeviceTabletIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No devices</h3>
                <p className="mt-1 text-sm text-gray-500">No devices found for this location.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <motion.div
                    key={device.id}
                    layout
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            {getDeviceTypeIcon(device.device_type)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {editingDevice === device.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Device name"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRename(device.id, editName)}
                                disabled={actionLoading === device.id}
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <CloseIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {device.name}
                              </h4>
                              <p className="text-xs text-gray-500 capitalize">
                                {device.device_type} • ID: {device.device_id}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(device.status)}`}>
                            {device.status}
                          </span>
                          
                          {device.is_online && (
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {editingDevice !== device.id && (
                          <>
                            <button
                              onClick={() => startEdit(device)}
                              disabled={actionLoading === device.id}
                              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Rename device"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleToggleStatus(device.id, device.status)}
                              disabled={actionLoading === device.id}
                              className={`p-2 rounded-lg transition-colors ${
                                device.status === 'active' 
                                  ? 'text-orange-600 hover:bg-orange-100' 
                                  : 'text-green-600 hover:bg-green-100'
                              }`}
                              title={device.status === 'active' ? 'Deactivate device' : 'Activate device'}
                            >
                              <PowerIcon className="h-4 w-4" />
                            </button>
                            
                            {deleteConfirm === device.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleDelete(device.id)}
                                  disabled={actionLoading === device.id}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Confirm delete"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Cancel delete"
                                >
                                  <CloseIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(device.id)}
                                disabled={actionLoading === device.id}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete device"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                        
                        {actionLoading === device.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    </div>

                    {deleteConfirm === device.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                          <p className="text-sm text-red-800">
                            Are you sure you want to delete "{device.name}"? This action cannot be undone.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeviceManagementModal;