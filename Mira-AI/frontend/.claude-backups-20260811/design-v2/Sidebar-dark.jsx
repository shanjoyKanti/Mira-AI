import { ChartNoAxesCombined, House, Settings, SquarePlus, Zap, X, Trash2, SearchCode, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { BrandLogo } from '../ui/BrandLogo';

/* Dark navigation rail (Stripe/Supabase-style): chrome recedes into near-black,
   the light work area holds the data. Active item = soft white wash + accent icon. */
const NavLink = ({ item, active }) => (
  <Link
    to={item.path}
    className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400 ${
      active
        ? 'bg-white/10 text-white font-medium'
        : 'text-slate-400 font-medium hover:bg-white/5 hover:text-slate-100'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <span
      className={`flex-shrink-0 transition-colors ${
        active ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
      }`}
    >
      {item.icon}
    </span>
    <span className="flex-1">{item.label}</span>
  </Link>
);

const SectionLabel = ({ children }) => (
  <p className="px-3 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 select-none">
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
    { path: '/transform/select', label: 'Modernize Code', icon: <Zap size={17} aria-hidden="true" /> },
  ];

  const manageNavItems = [
    { path: '/projects/delete', label: 'Delete Projects', icon: <Trash2 size={17} aria-hidden="true" /> },
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
        fixed left-0 top-0 h-full w-60 bg-slate-950 z-40
        flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-white/10 flex-shrink-0">
        <BrandLogo dark to="/dashboard" markClass="w-7 h-7 text-xs" textClass="text-base" />
      </div>

      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-3.5 right-3 p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
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
      <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
          <span className="font-medium text-slate-400">Mira AI</span>
          <span className="font-mono">v2.0</span>
        </div>
      </div>
    </aside>
  );
};
