import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { apiService, type Subscription, type Location } from '../services/api';
import CreateSubscriptionModal from './CreateSubscriptionModal';

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscriptionsData, locationsData] = await Promise.all([
        apiService.getSubscriptions(),
        apiService.getLocations()
      ]);
      setSubscriptions(subscriptionsData);
      setLocations(locationsData);
    } catch (err) {
      setError('Failed to load subscriptions');
      console.error('Subscriptions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'trialing':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'past_due':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'canceled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    
    try {
      await apiService.cancelSubscription(subscriptionId);
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      alert('Failed to cancel subscription');
    }
  };

  const getLocationsWithoutSubscription = () => {
    const subscribedLocationIds = subscriptions
      .filter(sub => ['active', 'trialing', 'past_due'].includes(sub.status))
      .map(sub => sub.location_id);
    
    return locations.filter(loc => !subscribedLocationIds.includes(loc.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading subscriptions</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-1">Manage your location subscriptions and billing</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Subscription</span>
        </motion.button>
      </div>

      {/* Subscriptions Grid */}
      {subscriptions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a subscription for your locations.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create Subscription
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {subscriptions.map((subscription) => (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(subscription.status)}
                    <h3 className="font-medium text-gray-900">
                      {subscription.location_name || 'Unassigned Subscription'}
                    </h3>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Plan</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(subscription.plan)}`}>
                      {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Price</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${subscription.monthly_price}/month
                    </span>
                  </div>

                  {subscription.current_period_end && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Next billing</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                  )}

                  {subscription.trial_end && subscription.status === 'trialing' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Trial ends</span>
                      <span className="text-sm text-blue-600 font-medium">
                        {formatDate(subscription.trial_end)}
                      </span>
                    </div>
                  )}
                </div>

                {subscription.status !== 'canceled' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleCancelSubscription(subscription.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {subscriptions.filter(s => s.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">Active Subscriptions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {subscriptions.filter(s => s.status === 'trialing').length}
          </div>
          <div className="text-sm text-gray-500">Trial Subscriptions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            ${subscriptions
              .filter(s => ['active', 'trialing'].includes(s.status))
              .reduce((sum, s) => sum + s.monthly_price, 0)
              .toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">Monthly Revenue</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {getLocationsWithoutSubscription().length}
          </div>
          <div className="text-sm text-gray-500">Unsubscribed Locations</div>
        </div>
      </div>

      {/* Create Subscription Modal */}
      <CreateSubscriptionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default SubscriptionsPage;