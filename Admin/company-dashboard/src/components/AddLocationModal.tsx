import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { type Company, type Subscription, apiService } from '../services/api';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyId: string, locationData: {
    name: string;
    address: string;
    subscription_id: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    status?: string;
    contact_info?: Record<string, any>;
  }) => Promise<void>;
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    company_id: '',
    subscription_id: '',
    latitude: '',
    longitude: '',
    timezone: 'UTC',
    status: 'active',
    phone: '',
    email: '',
    manager: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSubscriptions, setAvailableSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Fetch current user info and auto-select company for company admins
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!isOpen) return;
      
      setLoadingUser(true);
      try {
        const response = await fetch('http://localhost:8000/auth/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const userData = {
            ...data.user,
            company_id: data.company?.id
          };
          setCurrentUser(userData);
          
          // Auto-select company for company admins
          if (userData.role === 'company_admin' && userData.company_id) {
            setFormData(prev => ({ ...prev, company_id: userData.company_id }));
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, [isOpen]);

  // Fetch available subscriptions when modal opens and user is loaded
  useEffect(() => {
    const fetchAvailableSubscriptions = async () => {
      if (!currentUser?.company_id || loadingUser) {
        setAvailableSubscriptions([]);
        return;
      }

      setLoadingSubscriptions(true);
      try {
        const response = await fetch(`http://localhost:8000/companies/${currentUser.company_id}/available-subscriptions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const subscriptions = await response.json();
          setAvailableSubscriptions(subscriptions);
        } else {
          setAvailableSubscriptions([]);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        setAvailableSubscriptions([]);
      } finally {
        setLoadingSubscriptions(false);
      }
    };

    fetchAvailableSubscriptions();
  }, [currentUser?.company_id, loadingUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) {
      setError('Company information is required');
      return;
    }
    if (!formData.subscription_id) {
      setError('Please select a subscription');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const locationData = {
        name: formData.name,
        address: formData.address,
        subscription_id: formData.subscription_id,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        timezone: formData.timezone,
        status: formData.status,
        contact_info: {
          phone: formData.phone,
          email: formData.email,
          manager: formData.manager
        }
      };

      await onSave(formData.company_id, locationData);
      
      // Reset form but keep company_id for company admins
      setFormData({
        name: '',
        address: '',
        company_id: currentUser?.role === 'company_admin' ? currentUser.company_id : '',
        subscription_id: '',
        latitude: '',
        longitude: '',
        timezone: 'UTC',
        status: 'active',
        phone: '',
        email: '',
        manager: ''
      });
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
              onClick={onClose}
            />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative inline-block w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Location
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Subscription Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription *
                  </label>
                  {loadingUser ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-gray-500">Loading user information...</span>
                    </div>
                  ) : (
                    loadingSubscriptions ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-gray-500">Loading subscriptions...</span>
                      </div>
                    ) : availableSubscriptions.length > 0 ? (
                      <select
                        name="subscription_id"
                        value={formData.subscription_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a subscription</option>
                        {availableSubscriptions.map(subscription => (
                          <option key={subscription.id} value={subscription.id}>
                            {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - ${subscription.monthly_price}/month
                            {subscription.status === 'trialing' && ' (Trial)'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50">
                        <div className="flex items-center text-yellow-700">
                          <CreditCardIcon className="h-4 w-4 mr-2" />
                          <span className="text-sm">No available subscriptions</span>
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">
                          You need an unassigned subscription to create a location.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            // Navigate to subscriptions page
                            window.location.href = '/subscriptions';
                          }}
                          className="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                        >
                          Create Subscription
                        </button>
                      </div>
                    )
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Main Office, NYC Branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    placeholder="Full address including city, state, and zip code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude (optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      placeholder="40.7128"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude (optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      placeholder="-74.0060"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Singapore">Singapore</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1-555-0123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="office@company.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manager
                      </label>
                      <input
                        type="text"
                        name="manager"
                        value={formData.manager}
                        onChange={handleChange}
                        placeholder="Location manager name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Location'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddLocationModal;