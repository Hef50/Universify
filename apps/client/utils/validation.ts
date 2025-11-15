import { PasswordStrength } from '@/types/user';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateEduEmail = (email: string): boolean => {
  if (!validateEmail(email)) return false;
  return email.toLowerCase().endsWith('.edu');
};

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const isValid = hasMinLength && hasUppercase && hasNumber && hasSpecialChar;

  return {
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
    isValid,
  };
};

export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): boolean => {
  return password === confirmPassword && password.length > 0;
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 10;
};

export const validateCapacity = (capacity: string): boolean => {
  const num = parseInt(capacity, 10);
  return !isNaN(num) && num > 0 && num <= 10000;
};

export const validateDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end >= start;
};

export const validateTimeRange = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): boolean => {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  return end > start;
};

export const validateFutureDate = (date: string): boolean => {
  const inputDate = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return inputDate >= now;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const validateEventTitle = (title: string): { valid: boolean; error?: string } => {
  if (!validateRequired(title)) {
    return { valid: false, error: 'Title is required' };
  }
  if (title.length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' };
  }
  if (title.length > 100) {
    return { valid: false, error: 'Title must be less than 100 characters' };
  }
  return { valid: true };
};

export const validateEventDescription = (description: string): { valid: boolean; error?: string } => {
  if (!validateRequired(description)) {
    return { valid: false, error: 'Description is required' };
  }
  if (description.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters' };
  }
  if (description.length > 1000) {
    return { valid: false, error: 'Description must be less than 1000 characters' };
  }
  return { valid: true };
};

export const validateLocation = (location: string): { valid: boolean; error?: string } => {
  if (!validateRequired(location)) {
    return { valid: false, error: 'Location is required' };
  }
  if (location.length < 3) {
    return { valid: false, error: 'Location must be at least 3 characters' };
  }
  return { valid: true };
};

export const getPasswordStrengthText = (strength: PasswordStrength): string => {
  const validCount = [
    strength.hasMinLength,
    strength.hasUppercase,
    strength.hasNumber,
    strength.hasSpecialChar,
  ].filter(Boolean).length;

  if (validCount === 0) return 'Very Weak';
  if (validCount === 1) return 'Weak';
  if (validCount === 2) return 'Fair';
  if (validCount === 3) return 'Good';
  return 'Strong';
};

export const getPasswordStrengthColor = (strength: PasswordStrength): string => {
  const validCount = [
    strength.hasMinLength,
    strength.hasUppercase,
    strength.hasNumber,
    strength.hasSpecialChar,
  ].filter(Boolean).length;

  if (validCount <= 1) return '#FF6B6B';
  if (validCount === 2) return '#FFA07A';
  if (validCount === 3) return '#FFD93D';
  return '#6BCF7F';
};

