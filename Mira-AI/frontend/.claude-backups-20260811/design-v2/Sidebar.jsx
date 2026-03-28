import { ChartNoAxesCombined, House, Settings, SquarePlus, Zap, X, Trash2, SearchCode, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

const NavLink = ({ item, active }) => (
  <Link
    to={item.path}
    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
      active
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <span
      className={`flex-shrink-0 transition-colors ${
        active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
      }`}
    >
      {item.icon}
    </span>
    <span className="flex-1">{item.label}</span>
    {active && (
      <span className="w-1.5 h-1.5 rounded-full bg-primary-500" aria-hidden="true" />
    )}
  </Link>
);

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_superuser;

  // Same vocabulary and order as the dashboard's Quick Actions workflow
  // (recognition over recall — one name per concept everywhere).
  const baseNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <House size={18} aria-hidden="true" /> },
    { path: '/project/new', label: 'New Project', icon: <SquarePlus size={18} aria-hidden="true" /> },
    { path: '/analyze/select', label: 'Analyze Source Code', icon: <SearchCode size={18} aria-hidden="true" /> },
    { path: '/report/select', label: 'Security Scan', icon: <ShieldCheck size={18} aria-hidden="true" /> },
    { path: '/transform/select', label: 'Modernize Code', icon: <Zap size={18} aria-hidden="true" /> },
  ];

  const manageNavItems = [
    { path: '/projects/delete', label: 'Delete Projects', icon: <Trash2 size={18} aria-hidden="true" /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} aria-hidden="true" /> }
  ];

  const adminNavItems = [
    { path: '/admin/usage', label: 'Usage & Cost', icon: <ChartNoAxesCombined size={18} aria-hidden="true" /> }
  ];

  const isActive = (path) => location.pathname === path;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <aside
      className={`
        fixed left-0 top-16 h-full w-64 bg-white/90 backdrop-blur-xl border-r border-gray-200/80 pt-6 z-40
        flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="Close sidebar"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto" role="navigation" aria-label="Sidebar menu">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 select-none">
          Workspace
        </p>
        {baseNavItems.map((item) => (
          <NavLink key={item.path} item={item} active={isActive(item.path)} />
        ))}

        <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 select-none">
          Manage
        </p>
        {manageNavItems.map((item) => (
          <NavLink key={item.path} item={item} active={isActive(item.path)} />
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 select-none">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <NavLink key={item.path} item={item} active={isActive(item.path)} />
            ))}
          </>
        )}
      </nav>

      {/* Footer — product identity chip */}
      <div className="px-4 py-4 mb-16 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" aria-hidden="true" />
          <span className="font-medium">Mira AI</span>
          <span className="font-mono">v2.0</span>
        </div>
      </div>
    </aside>
  );
};

// Dev: Shanjoy Kanti - 2026-03-30

// Dev: Mohiuzzaman Anik - 2026-03-28
