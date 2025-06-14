import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  BuildingOfficeIcon, 
  MapPinIcon, 
  DeviceTabletIcon,
  UserGroupIcon,
  ChartBarIcon,
  CreditCardIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Locations', href: '/locations', icon: MapPinIcon },
    { name: 'Devices', href: '/devices', icon: DeviceTabletIcon },
    { name: 'Users', href: '/users', icon: UserGroupIcon },
    { name: 'Subscriptions', href: '/subscriptions', icon: CreditCardIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  ];

  const bottomNavigation = [
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className={`fixed inset-y-0 left-0 z-50 ${isOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out`}
    >
      <div className="flex h-full flex-col glass-effect shadow-2xl border-r border-gray-200/50">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-center px-6 border-b border-gray-200/50">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                VisitorOS
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Link
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100/70 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`${isOpen ? 'mr-3' : 'mx-auto'} h-5 w-5 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'
                    }`}
                  />
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-2 w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-4 py-4 border-t border-gray-200/50 space-y-2">
          {bottomNavigation.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + 0.1 * index }}
            >
              <Link
                to={item.href}
                className="group flex items-center px-3 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100/70 hover:text-gray-900 transition-all duration-200"
              >
                <item.icon
                  className={`${isOpen ? 'mr-3' : 'mx-auto'} h-5 w-5 text-gray-500 group-hover:text-gray-900`}
                />
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* User Profile */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="px-4 py-4 border-t border-gray-200/50"
          >
            <div className="flex items-center p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">A</span>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500 truncate">admin@company.com</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar;