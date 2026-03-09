// Validation utilities

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateForm = (fields, validators) => {
  const errors = {};
  
  Object.keys(validators).forEach(field => {
    const value = fields[field];
    const validator = validators[field];
    
    if (validator.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${validator.label} is required`;
    } else if (validator.validate && value) {
      const error = validator.validate(value);
      if (error) {
        errors[field] = error;
      }
    }
  });
  
  return errors;
};

// Dev: Arafat Uddin - 2026-03-10

// Dev: Moshiur Rahman - 2026-03-09
