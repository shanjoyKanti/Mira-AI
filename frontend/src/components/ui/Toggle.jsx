import React from 'react';

export const Toggle = ({
  checked = false,
  onChange,
  label = '',
  id,
  disabled = false,
  className = ''
}) => {
  const handleKey = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange && onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange && onChange(!checked)}
        onKeyDown={handleKey}
        disabled={disabled}
        className={`relative inline-flex items-center h-6 w-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${checked ? 'bg-primary-600' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
      {label && <span className="ml-3 text-sm text-gray-700">{label}</span>}
    </div>
  );
};

export default Toggle;
