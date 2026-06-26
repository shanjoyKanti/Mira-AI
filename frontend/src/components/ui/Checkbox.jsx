export const Checkbox = ({ 
  label, 
  checked, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {label && (
        <label className="ml-2 text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};

// Dev: Shanjoy Kanti - 2026-06-11

// Dev: Shanjoy Kanti - 2026-06-26
