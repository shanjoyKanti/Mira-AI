import { ChartNoAxesCombined, House, Settings, SquarePlus, Zap, X, FolderCog, SearchCode, ShieldCheck, FileChartColumn } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { BrandLogo } from '../ui/BrandLogo';

/* Light navigation rail: same structure as the dark variant (brand inside the
   rail, workflow-ordered items, section labels) but dark-on-light text for
   maximum legibility. Active item = primary wash + accent icon. */
const NavLink = ({ item, active }) => (
  <Link
    to={item.path}
    className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
      active
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <span
      className={`flex-shrink-0 transition-colors ${
        active ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
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

const SectionLabel = ({ children }) => (
  <p className="px-3 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 select-none">
    {children}
  </p>
);

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_superuser;

  // Same vocabulary and order as the dashboard's Quick Actions workflow
  // (recognition over recall — one name per concept everywhere).
  const baseNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <House size={17} aria-hidden="true" /> },
    { path: '/project/new', label: 'New Project', icon: <SquarePlus size={17} aria-hidden="true" /> },
    { path: '/analyze/select', label: 'Analyze Source Code', icon: <SearchCode size={17} aria-hidden="true" /> },
    { path: '/report/select', label: 'Security Scan', icon: <ShieldCheck size={17} aria-hidden="true" /> },
    // Library of every generated report — security AND compliance frameworks
    // (OWASP Top 10, PCI DSS, ISO 27001): view, download, re-open.
    { path: '/reports', label: 'Compliance Reports', icon: <FileChartColumn size={17} aria-hidden="true" /> },
    { path: '/transform/select', label: 'Modernize Code', icon: <Zap size={17} aria-hidden="true" /> },
  ];

  const manageNavItems = [
    { path: '/projects/delete', label: 'Projects', icon: <FolderCog size={17} aria-hidden="true" /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={17} aria-hidden="true" /> }
  ];

  const adminNavItems = [
    { path: '/admin/usage', label: 'Usage & Cost', icon: <ChartNoAxesCombined size={17} aria-hidden="true" /> }
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
        fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 z-40
        flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-gray-100 flex-shrink-0">
        <BrandLogo to="/dashboard" markClass="w-7 h-7 text-xs" textClass="text-base" />
      </div>

      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-3.5 right-3 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="Close sidebar"
      >
        <X size={18} aria-hidden="true" />
      </button>

      <nav className="px-3 pb-4 space-y-0.5 flex-1 overflow-y-auto" role="navigation" aria-label="Sidebar menu">
        <SectionLabel>Workspace</SectionLabel>
        {baseNavItems.map((item) => (
          <NavLink key={item.path} item={item} active={isActive(item.path)} />
        ))}

        <SectionLabel>Manage</SectionLabel>
        {manageNavItems.map((item) => (
          <NavLink key={item.path} item={item} active={isActive(item.path)} />
        ))}

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            {adminNavItems.map((item) => (
              <NavLink key={item.path} item={item} active={isActive(item.path)} />
            ))}
          </>
        )}
      </nav>

      {/* Footer — product identity chip */}
      <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
          <span className="font-medium text-gray-500">Mira AI</span>
          <span className="font-mono">v2.0</span>
        </div>
      </div>
    </aside>
  );
};
