import React from 'react';

export const RadioGroup = ({
  label,
  name,
  options = [],
  value,
  onChange,
  direction = 'vertical',
  className = ''
}) => {
  return (
    <fieldset className={`w-full ${className}`}>
      {label && <legend className="text-sm font-medium text-gray-700 mb-2">{label}</legend>}
      <div className={`flex ${direction === 'horizontal' ? 'space-x-4' : 'flex-col space-y-2'}`} role="radiogroup" aria-label={label || name}>
        {options.map((opt) => (
          <label key={opt.value} className={`inline-flex items-center cursor-pointer ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => !opt.disabled && onChange && onChange(e.target.value)}
              disabled={opt.disabled}
              className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default RadioGroup;
