import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { type Company } from '../services/api';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onSave: (userData: {
    first_name: string;
    last_name: string;
    email: string;
    company_id: string;
    role: 'admin' | 'manager' | 'employee' | 'viewer';
    status: 'active' | 'inactive' | 'suspended';
    permissions: string[];
  }) => Promise<void>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSave
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_id: '',
    role: 'employee' as 'admin' | 'manager' | 'employee' | 'viewer',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    permissions: ['read_visitors', 'write_visitors', 'read_devices', 'read_locations', 'read_analytics'] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Available permissions
  const availablePermissions = [
    'read_visitors',
    'write_visitors',
    'read_devices',
    'write_devices',
    'read_locations',
    'write_locations',
    'read_users',
    'write_users',
    'read_analytics',
    'admin_settings'
  ];

  // Fetch current user info and auto-select company
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!isOpen) return;
      
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
      }
    };

    fetchCurrentUser();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      // Reset form but keep company_id for company admins
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        company_id: currentUser?.role === 'company_admin' ? currentUser.company_id : '',
        role: 'employee',
        status: 'active',
        permissions: ['read_visitors', 'write_visitors', 'read_devices', 'read_locations', 'read_analytics']
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update permissions based on role
    if (name === 'role') {
      let newPermissions: string[] = [];
      switch (value) {
        case 'admin':
          newPermissions = availablePermissions; // All permissions
          break;
        case 'manager':
          newPermissions = [
            'read_visitors', 'write_visitors',
            'read_devices', 'write_devices',
            'read_locations', 'write_locations',
            'read_users', 'read_analytics'
          ];
          break;
        case 'employee':
          newPermissions = [
            'read_visitors', 'write_visitors',
            'read_devices', 'read_locations', 'read_analytics'
          ];
          break;
        case 'viewer':
          newPermissions = [
            'read_visitors', 'read_devices', 'read_locations', 'read_analytics'
          ];
          break;
      }
      setFormData(prev => ({ 
        ...prev, 
        [name]: value as 'admin' | 'manager' | 'employee' | 'viewer', 
        permissions: newPermissions 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return availablePermissions;
      case 'manager':
        return ['read_visitors', 'write_visitors', 'read_devices', 'write_devices', 'read_locations', 'write_locations', 'read_users', 'read_analytics'];
      case 'employee':
        return ['read_visitors', 'write_visitors', 'read_devices', 'read_locations'];
      case 'viewer':
        return ['read_visitors', 'read_devices', 'read_locations'];
      default:
        return [];
    }
  };

  // Auto-update permissions when role changes
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as 'admin' | 'manager' | 'employee' | 'viewer';
    const rolePermissions = getRolePermissions(newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: rolePermissions
    }));
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
              className="relative inline-block w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New User
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

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Company and Role */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser?.role === 'super_admin' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company *
                      </label>
                      <select
                        name="company_id"
                        value={formData.company_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a company</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                        {companies.find(c => c.id === formData.company_id)?.name || 'Loading...'}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
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
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions
                  </label>
                  {formData.role === 'employee' ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Employee Permissions:</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          <li className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            Read Visitors
                          </li>
                          <li className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            Write Visitors
                          </li>
                          <li className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            Read Devices
                          </li>
                          <li className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            Read Locations
                          </li>
                          <li className="flex items-center">
                            <span className="text-green-500 mr-2">✓</span>
                            Read Analytics
                          </li>
                        </ul>
                      </div>
                      <p className="text-xs text-gray-500">
                        Employee permissions are fixed and cannot be modified.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availablePermissions.map(permission => (
                          <label key={permission} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission)}
                              onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Permissions are automatically set based on role, but can be customized.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
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
                    {loading ? 'Creating...' : 'Create User'}
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

export default AddUserModal;