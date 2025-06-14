import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { apiService, type User, type Company } from '../services/api';
import EditUserModal from './EditUserModal';
import AddUserModal from './AddUserModal';
import DeleteConfirmModal from './DeleteConfirmModal';

const UsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [companiesData, usersData] = await Promise.all([
        apiService.getCompanies(),
        apiService.getUsers()
      ]);
      
      setCompanies(companiesData);
      setUsers(usersData);
    } catch (err) {
      setError('Failed to load users');
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const userRoles = ['admin', 'manager', 'employee', 'viewer'];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesCompany = filterCompany === 'all' || (user.company_name && user.company_name === filterCompany);
    return matchesSearch && matchesStatus && matchesRole && matchesCompany;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<User>) => {
    if (!selectedUser) return;
    
    try {
      await apiService.updateUser(selectedUser.id, updatedData);
      await fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const handleAddUser = async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    company_id: string;
    role: 'admin' | 'manager' | 'employee' | 'viewer';
    status: 'active' | 'inactive' | 'suspended';
    permissions: string[];
  }) => {
    try {
      await apiService.createUser(userData);
      await fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      await apiService.deleteUser(selectedUser.id);
      await fetchData(); // Refresh the list
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleSelectUser = (userId: string, selected: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (selected) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
      setShowBulkActions(true);
    } else {
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkStatusChange = async (status: 'active' | 'inactive' | 'suspended') => {
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedUsers).map(userId => 
          apiService.updateUser(userId, { status })
        )
      );
      await fetchData();
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRoleChange = async (role: 'admin' | 'manager' | 'employee' | 'viewer') => {
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedUsers).map(userId => 
          apiService.updateUser(userId, { role })
        )
      );
      await fetchData();
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to update user roles:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load users</h3>
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
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions across companies</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setAddModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add User
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
              placeholder="Search users..."
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
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-gray-200/50 rounded-xl px-3 py-2.5 bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            >
              <option value="all">All Roles</option>
              {userRoles.map(role => (
                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
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

      {/* Bulk Actions */}
      {showBulkActions && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="glass-effect rounded-2xl p-4 border border-blue-200/50 bg-blue-50/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-blue-700">Bulk Status:</label>
                <select
                  onChange={(e) => handleBulkStatusChange(e.target.value as 'active' | 'inactive' | 'suspended')}
                  className="text-xs border border-blue-300 rounded px-2 py-1 bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>Change Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-blue-700">Bulk Role:</label>
                <select
                  onChange={(e) => handleBulkRoleChange(e.target.value as 'admin' | 'manager' | 'employee' | 'viewer')}
                  className="text-xs border border-blue-300 rounded px-2 py-1 bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>Change Role</option>
                  <option value="viewer">Viewer</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedUsers(new Set());
                setShowBulkActions(false);
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear Selection
            </button>
          </div>
        </motion.div>
      )}

      {/* Select All */}
      {filteredUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2 px-2"
        >
          <input
            type="checkbox"
            checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            Select All ({filteredUsers.length} users)
          </span>
        </motion.div>
      )}

      {/* Users Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
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
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {getInitials(user.first_name, user.last_name)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                  <button className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Role and Company */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                  <div className="flex items-center space-x-1">
                    <ShieldCheckIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{user.permissions.length} permissions</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    <span>{user.company_name || 'Unknown Company'}</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>

              {/* Last Activity */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Last login:</span>
                  <span className="text-gray-700">{getTimeAgo(user.last_login)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Member since:</span>
                  <span className="text-gray-700">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
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
                  onClick={() => handleEditUser(user)}
                  className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openDeleteModal(user)}
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
      {filteredUsers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first user.'}
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
                Add User
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={selectedUser}
        companies={companies}
        onSave={handleSaveUser}
      />

      <AddUserModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        companies={companies}
        onSave={handleAddUser}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.first_name} ${selectedUser?.last_name}? This action cannot be undone.`}
        confirmText="Delete User"
        loading={actionLoading}
      />
    </div>
  );
};

export default UsersPage;