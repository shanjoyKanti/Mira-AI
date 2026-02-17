export const Badge = ({ children, variant = 'default', dot = false, className = '' }) => {
  const variants = {
    default: 'bg-gray-50 text-gray-700 ring-gray-500/20',
    success: 'bg-green-50 text-green-700 ring-green-600/20',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-600/25',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    primary: 'bg-primary-50 text-primary-700 ring-primary-600/20',
    // SaaS status-friendly variants
    draft: 'bg-gray-50 text-gray-700 ring-gray-500/20',
    running: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    completed: 'bg-green-50 text-green-700 ring-green-600/20',
    failed: 'bg-red-50 text-red-700 ring-red-600/20'
  };

  const dotColors = {
    default: 'bg-gray-400',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    primary: 'bg-primary-500',
    draft: 'bg-gray-400',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${variants[variant] || variants.default} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.default}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

// Updated by Mohiuzzaman Anik on 2026-03-29
// Added: New feature implementation
