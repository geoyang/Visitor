import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  Bars3Icon, 
  BellIcon, 
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, onLogout }) => {
  const [isDark, setIsDark] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState<any>(null);
  const [buttonRect, setButtonRect] = React.useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    // Fetch current user info
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUserInfo(userData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  // Close dropdown when pressing escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showUserMenu) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showUserMenu]);

  const handleToggleUserMenu = () => {
    if (!showUserMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
    setShowUserMenu(!showUserMenu);
  };

  // Update button position on scroll/resize
  React.useEffect(() => {
    const updatePosition = () => {
      if (showUserMenu && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonRect(rect);
      }
    };

    if (showUserMenu) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showUserMenu]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect border-b border-gray-200/50 px-6 py-4"
      >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100/70 transition-colors duration-200"
          >
            <Bars3Icon className="h-5 w-5 text-gray-600" />
          </motion.button>

          <div className="hidden md:block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Company Administration
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage your visitor management platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search companies, locations..."
              className="block w-64 pl-10 pr-3 py-2 border border-gray-200/50 rounded-lg leading-5 bg-white/50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
            />
          </motion.div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg hover:bg-gray-100/70 transition-colors duration-200"
          >
            {isDark ? (
              <SunIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-600" />
            )}
          </motion.button>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-gray-100/70 transition-colors duration-200 relative"
            >
              <BellIcon className="h-5 w-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">3</span>
              </span>
            </motion.button>
          </motion.div>

          {/* User Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative"
            style={{ zIndex: 10000 }}
          >
            <motion.button
              ref={buttonRef}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleUserMenu}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100/70 transition-colors duration-200"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                userInfo?.role === 'super_admin' 
                  ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                <span className="text-white font-medium text-sm">
                  {userInfo?.role === 'super_admin' ? 'SA' : 'A'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {userInfo?.name || 'Administrator'}
                </p>
                <p className="text-xs text-gray-500">
                  {userInfo?.role === 'super_admin' ? 'Super Admin' : 'Company Admin'}
                </p>
              </div>
            </motion.button>

          </motion.div>
        </div>
      </div>
      </motion.header>
      
      {showUserMenu && buttonRect && createPortal(
      <>
        {/* Backdrop for click-outside detection */}
        <div 
          className="fixed inset-0 z-[99999]"
          onClick={() => setShowUserMenu(false)}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48 z-[999999]"
          style={{
            top: buttonRect.bottom + 8,
            right: window.innerWidth - buttonRect.right,
            zIndex: 999999
          }}
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {userInfo?.name || 'Account'}
            </p>
            <p className="text-xs text-gray-500">
              {userInfo?.account_email || 'Manage your account'}
            </p>
            {userInfo?.role === 'super_admin' && (
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                Super Admin
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setShowUserMenu(false);
              // Add profile action here
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Profile Settings
          </button>
          <button
            onClick={() => {
              setShowUserMenu(false);
              // Add company settings action here
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Company Settings
          </button>
          <div className="border-t border-gray-100 mt-1">
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogout?.();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </>,
      document.body
      )}
    </>
  );
};

export default Header;