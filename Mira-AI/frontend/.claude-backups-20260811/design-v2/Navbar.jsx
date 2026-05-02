import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BrandLogo } from '../ui/BrandLogo';

export const Navbar = ({ onMenuClick }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleDropdownKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const navLinkClasses = 'text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/80 fixed w-full z-50 top-0" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            {isAuthenticated && onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden mr-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Toggle menu"
                aria-expanded="false"
              >
                <Menu size={24} aria-hidden="true" />
              </button>
            )}

            <BrandLogo textClass="text-xl sm:text-2xl" />
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {!isAuthenticated ? (
              <>
                <Link to="/login">
                  <button className={navLinkClasses}>
                    Login
                  </button>
                </Link>
                <Link to="/signup">
                  <button className="btn-primary text-sm sm:text-base">
                    Get Started
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="hidden sm:block">
                  <button className={navLinkClasses}>
                    Dashboard
                  </button>
                </Link>
                <Link to="/reference" className="hidden sm:block">
                  <button className={navLinkClasses}>
                    Reference
                  </button>
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onKeyDown={handleDropdownKeyDown}
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 p-1 hover:bg-gray-50 transition-colors"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                    aria-label="User menu"
                  >
                    <div
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white shadow-sm"
                      aria-hidden="true"
                    >
                      {user?.role === 'admin' ? 'A' : user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 hidden sm:block text-gray-400 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="pop-in absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-gray-900/5 border border-gray-200 z-50 overflow-hidden"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'User'}</p>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{user?.role || 'user'} account</p>
                      </div>
                      <div className="py-1">
                        <button
                          className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                          role="menuitem"
                          onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                        >
                          <Settings className="w-4 h-4 text-gray-400" aria-hidden="true" />
                          Profile & Settings
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none transition-colors"
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Dev: Mohiuzzaman Anik - 2026-05-02
