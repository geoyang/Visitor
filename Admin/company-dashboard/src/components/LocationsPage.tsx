import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  MapPinIcon,
  DeviceTabletIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MapIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { apiService, type Location, type Company } from '../services/api';
import EditLocationModal from './EditLocationModal';
import AddLocationModal from './AddLocationModal';
import LocationDetailsModal from './LocationDetailsModal';

const LocationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [locations, setLocations] = useState<Location[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [companiesData, locationsData] = await Promise.all([
        apiService.getCompanies(),
        apiService.getLocations()
      ]);
      
      setCompanies(companiesData);
      setLocations(locationsData);
    } catch (err) {
      setError('Failed to load locations');
      console.error('Locations fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(location => {
    // Ensure all string values are defined
    const search = (searchTerm || '').toLowerCase();
    const locationName = (location.name || '').toLowerCase();
    const locationAddress = (location.address || '').toLowerCase();
    const locationCompanyName = (location.company_name || '').toLowerCase();
    
    const matchesSearch = locationName.includes(search) ||
                         locationAddress.includes(search) ||
                         locationCompanyName.includes(search);
    const matchesStatus = filterStatus === 'all' || location.status === filterStatus;
    const matchesCompany = filterCompany === 'all' || location.company_name === filterCompany;
    return matchesSearch && matchesStatus && matchesCompany;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setEditModalOpen(true);
  };

  const handleViewLocation = (location: Location) => {
    setSelectedLocation(location);
    setDetailsModalOpen(true);
  };

  const handleSaveLocation = async (updatedData: Partial<Location>) => {
    if (!selectedLocation) return;
    
    try {
      await apiService.updateLocation(selectedLocation.id, updatedData);
      await fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  };

  const handleCreateLocation = async (companyId: string, locationData: any) => {
    try {
      await apiService.createLocation(companyId, locationData);
      await fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to create location:', error);
      throw error;
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load locations</h3>
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
          <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-600 mt-1">Manage locations across all companies</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setAddModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Location
        </motion.button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-effect rounded-2xl p-6 border border-gray-200/50"
      >
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200/50 rounded-xl leading-5 bg-white/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
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
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

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

      {/* Locations Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredLocations.map((location, index) => (
            <motion.div
              key={location.id}
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
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <MapPinIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {location.name}
                    </h3>
                    <p className="text-sm text-gray-500">{location.company_name || 'Unknown Company'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(location.status)}`}>
                    {location.status}
                  </span>
                  <button className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="mb-4">
                <div className="flex items-start space-x-2">
                  <MapIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-1">
                    <DeviceTabletIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{location.devices_count}</p>
                  <p className="text-xs text-gray-500">Devices</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-1">
                    <UserGroupIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{location.active_visitors_count}</p>
                  <p className="text-xs text-gray-500">Visitors</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg mx-auto mb-1">
                    <ClockIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">UTC</p>
                  <p className="text-xs text-gray-500">Timezone</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200/50 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleViewLocation(location)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEditLocation(location)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  <TrashIcon className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredLocations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first location.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Location
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      <EditLocationModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        location={selectedLocation}
        companies={companies}
        onSave={handleSaveLocation}
      />

      <AddLocationModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleCreateLocation}
      />

      <LocationDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        location={selectedLocation}
      />
    </div>
  );
};

export default LocationsPage;