import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CreditCardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { apiService, type Location, type SubscriptionCreate } from '../services/api';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUBSCRIPTION_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    priceId: 'price_basic_monthly',
    features: [
      'Up to 2 devices',
      'Basic visitor management',
      'Email notifications',
      'Standard support'
    ],
    color: 'gray'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    priceId: 'price_professional_monthly',
    features: [
      'Up to 10 devices',
      'Advanced analytics',
      'Custom forms',
      'SMS notifications',
      'Priority support'
    ],
    color: 'blue',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceId: 'price_enterprise_monthly',
    features: [
      'Up to 50 devices',
      'Advanced integrations',
      'Custom branding',
      'Dedicated support',
      'SLA guarantee'
    ],
    color: 'purple'
  }
];

const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setLoading(true);
    setError(null);

    try {
      const selectedPlanData = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
      if (!selectedPlanData) {
        throw new Error('Invalid plan selected');
      }

      const subscriptionData: SubscriptionCreate = {
        plan: selectedPlan as 'basic' | 'professional' | 'enterprise',
        price_id: selectedPlanData.priceId
        // Note: payment_method_id is optional - without it, creates a 14-day trial
        // Note: location_id is optional - can be assigned later when creating locations
      };

      await apiService.createSubscription(subscriptionData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const getPlanColorClasses = (color: string, selected: boolean) => {
    const baseClasses = selected ? 'ring-2 ring-offset-2' : 'hover:shadow-md';
    
    switch (color) {
      case 'blue':
        return `${baseClasses} ${selected ? 'ring-blue-500 border-blue-500' : 'border-gray-200 hover:border-blue-300'}`;
      case 'purple':
        return `${baseClasses} ${selected ? 'ring-purple-500 border-purple-500' : 'border-gray-200 hover:border-purple-300'}`;
      default:
        return `${baseClasses} ${selected ? 'ring-gray-500 border-gray-500' : 'border-gray-200 hover:border-gray-300'}`;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCardIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create Subscription</h2>
                  <p className="text-sm text-gray-500">Choose a plan for your location</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Trial Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CreditCardIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">14-Day Free Trial</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Your subscription will start with a 14-day free trial. You can assign it to locations later when creating them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Choose Subscription Plan
                </label>
                <div className="grid md:grid-cols-3 gap-4">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <motion.div
                      key={plan.id}
                      whileHover={{ scale: 1.02 }}
                      className={`relative border rounded-lg p-6 cursor-pointer transition-all ${getPlanColorClasses(plan.color, selectedPlan === plan.id)}`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                        {selectedPlan === plan.id && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-500">/month</span>
                      </div>

                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{loading ? 'Creating...' : 'Create Subscription'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default CreateSubscriptionModal;