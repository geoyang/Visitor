import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  UserGroupIcon,
  ClockIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiService, type Visitor, type Location } from '../services/api';

interface VisitorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

const VisitorManagementModal: React.FC<VisitorManagementModalProps> = ({
  isOpen,
  onClose,
  location
}) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'checked_out'>('checked_in');

  useEffect(() => {
    if (isOpen && location) {
      fetchVisitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location]);

  // Separate effect for filtering to avoid re-fetching data
  useEffect(() => {
    if (allVisitors.length > 0) {
      const filteredVisitors = allVisitors.filter(visitor => {
        if (filter === 'all') return true;
        return visitor.status === filter;
      });
      
      console.log('Re-filtering visitors for filter:', filter, 'result:', filteredVisitors);
      setVisitors(filteredVisitors);
    }
  }, [filter, allVisitors]);

  const fetchVisitors = async () => {
    if (!location) return;
    
    try {
      setLoading(true);
      console.log('Fetching all visitors for location:', location.id);
      
      // Always fetch all visitors to get complete data
      const allVisitorList = await apiService.getVisitors();
      
      console.log('All visitors received:', allVisitorList);
      
      // Filter visitors for this specific location if the API doesn't do it automatically
      // Note: The backend should filter by company locations, but we'll filter by specific location here
      const locationVisitors = allVisitorList.filter(visitor => 
        (visitor.form_id && visitor.form_id.includes(location.id)) || 
        visitor.data?.location_id === location.id ||
        // Fallback: if no location filtering is available, show all visitors
        true
      );
      
      console.log('All visitors for location:', locationVisitors);
      setAllVisitors(locationVisitors);
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
      setAllVisitors([]);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'bg-green-100 text-green-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime: string) => {
    try {
      return new Date(dateTime).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getCheckInDuration = (checkInTime: string) => {
    try {
      const checkIn = new Date(checkInTime);
      const now = new Date();
      const diffMs = now.getTime() - checkIn.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      } else {
        return `${diffMinutes}m`;
      }
    } catch {
      return 'Unknown';
    }
  };

  if (!isOpen || !location) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-2 sm:mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold truncate">Visitor Management</h2>
                <p className="text-purple-100 text-sm truncate">{location.name} - {allVisitors.length} total visitors</p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close dialog"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
              {[
                { key: 'checked_in' as const, label: 'Checked In', count: allVisitors.filter(v => v.status === 'checked_in').length },
                { key: 'checked_out' as const, label: 'Checked Out', count: allVisitors.filter(v => v.status === 'checked_out').length },
                { key: 'all' as const, label: 'All', count: allVisitors.length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-white text-purple-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4 sm:p-6" style={{ maxHeight: 'calc(95vh - 200px)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600">Loading visitors...</span>
              </div>
            ) : visitors.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No visitors</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filter === 'checked_in' 
                      ? 'No visitors are currently checked in at this location.' 
                      : filter === 'checked_out'
                      ? 'No visitors have checked out from this location.'
                      : 'No visitors found for this location.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visitors.map((visitor) => (
                  <motion.div
                    key={visitor.id}
                    layout
                    className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {visitor.full_name || visitor.data?.full_name || 'Unknown Visitor'}
                            </h4>
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium w-fit ${getStatusColor(visitor.status)}`}>
                              {visitor.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 text-sm text-gray-600">
                            {(visitor.company || visitor.data?.company) && (
                              <div className="flex items-center space-x-2">
                                <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                                <span>{visitor.company || visitor.data?.company}</span>
                              </div>
                            )}
                            
                            {(visitor.email || visitor.data?.email) && (
                              <div className="flex items-center space-x-2">
                                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                <span>{visitor.email || visitor.data?.email}</span>
                              </div>
                            )}
                            
                            {(visitor.phone || visitor.data?.phone) && (
                              <div className="flex items-center space-x-2">
                                <PhoneIcon className="h-4 w-4 text-gray-400" />
                                <span>{visitor.phone || visitor.data?.phone}</span>
                              </div>
                            )}
                            
                            {(visitor.host_name || visitor.data?.host_name) && (
                              <div className="flex items-center space-x-2">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <span>Host: {visitor.host_name || visitor.data?.host_name}</span>
                              </div>
                            )}
                          </div>
                          
                          {(visitor.visit_purpose || visitor.data?.visit_purpose) && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Purpose:</span> {visitor.visit_purpose || visitor.data?.visit_purpose}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end space-y-2 sm:ml-4 w-full sm:w-auto">
                        <div className="text-left sm:text-right text-sm w-full">
                          <div className="flex flex-col sm:items-end space-y-1">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <CalendarIcon className="h-4 w-4" />
                              <span className="truncate">Check-in: {formatDateTime(visitor.check_in_time)}</span>
                            </div>
                            
                            {visitor.status === 'checked_in' && (
                              <div className="flex items-center space-x-2 text-green-600">
                                <ClockIcon className="h-4 w-4" />
                                <span>Duration: {getCheckInDuration(visitor.check_in_time)}</span>
                              </div>
                            )}
                            
                            {visitor.check_out_time && (
                              <div className="flex items-center space-x-2 text-gray-600">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="truncate">Check-out: {formatDateTime(visitor.check_out_time)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {visitor.host_notified && (
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs w-fit">
                            Host Notified
                          </div>
                        )}
                      </div>
                    </div>

                    {visitor.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Notes:</p>
                            <p className="text-sm text-yellow-700">{visitor.notes}</p>
                          </div>
                        </div>
                      </div>
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

export default VisitorManagementModal;