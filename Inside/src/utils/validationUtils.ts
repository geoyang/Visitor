/**
 * Validation utility functions for form fields
 */

// Email validation regex pattern
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone number regex pattern (accepts US format with or without country code)
export const PHONE_REGEX = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates an email address
 * @param email - The email address to validate
 * @returns ValidationResult object with isValid boolean and optional error message
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      message: 'Email address is required'
    };
  }

  const trimmedEmail = email.trim();
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Validates a number field
 * @param value - The value to validate
 * @returns ValidationResult object with isValid boolean and optional error message
 */
export const validateNumber = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: 'Number is required'
    };
  }

  const trimmedValue = value.trim();
  
  // Check if it's a valid number (allows integers and decimals)
  if (isNaN(Number(trimmedValue)) || trimmedValue === '') {
    return {
      isValid: false,
      message: 'Please enter a valid number'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 * @param value - The phone number string to format
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Don't format if less than 3 digits
  if (phoneNumber.length < 3) {
    return phoneNumber;
  }
  
  // Format based on length
  if (phoneNumber.length < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else if (phoneNumber.length < 11) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  } else {
    // Handle numbers with country code (11 digits starting with 1)
    if (phoneNumber.startsWith('1') && phoneNumber.length === 11) {
      return `+1 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`;
    }
    // Truncate to 10 digits if more than 11
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }
};

/**
 * Validates a phone number
 * @param phone - The phone number to validate
 * @returns ValidationResult object with isValid boolean and optional error message
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return {
      isValid: false,
      message: 'Phone number is required'
    };
  }

  const trimmedPhone = phone.trim();
  
  // Remove formatting and check if it's a valid US phone number
  const digitsOnly = trimmedPhone.replace(/\D/g, '');
  
  // Accept 10 digits or 11 digits starting with 1
  if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'))) {
    return {
      isValid: true
    };
  }

  return {
    isValid: false,
    message: 'Please enter a valid phone number'
  };
};

/**
 * Validates a required field
 * @param value - The field value to validate
 * @param fieldName - The name of the field for error messages
 * @returns ValidationResult object
 */
export const validateRequired = (value: string, fieldName: string = 'Field'): ValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      message: `${fieldName} is required`
    };
  }

  return {
    isValid: true
  };
};

/**
 * Validates a field based on its type and validation rules
 * @param value - The field value
 * @param fieldType - The type of the field
 * @param validationRules - Array of validation rules
 * @param fieldLabel - The field label for error messages
 * @returns ValidationResult object
 */
export const validateField = (
  value: string,
  fieldType: string,
  validationRules: any[] = [],
  fieldLabel: string = 'Field'
): ValidationResult => {
  // Check required validation first
  const hasRequiredRule = validationRules.some(rule => rule.type === 'required');
  if (hasRequiredRule) {
    const requiredResult = validateRequired(value, fieldLabel);
    if (!requiredResult.isValid) {
      return requiredResult;
    }
  }

  // Skip other validations if field is empty and not required
  if (!value || value.trim() === '') {
    return { isValid: true };
  }

  // Email validation for email field types or explicit email validation rules
  if (fieldType === 'email' || validationRules.some(rule => rule.type === 'email')) {
    return validateEmail(value);
  }

  // Number validation for number field types or explicit number validation rules
  if (fieldType === 'number' || validationRules.some(rule => rule.type === 'number')) {
    return validateNumber(value);
  }

  // Phone validation for phone field types or explicit phone validation rules
  if (fieldType === 'phone' || validationRules.some(rule => rule.type === 'phone')) {
    return validatePhone(value);
  }

  // Additional validation types can be added here
  // For example: url, etc.

  return { isValid: true };
};

/**
 * Validates all fields in a form submission
 * @param formData - Object containing form field values
 * @param formFields - Array of form field definitions
 * @returns Object with validation results for each field
 */
export const validateFormSubmission = (
  formData: Record<string, string>,
  formFields: any[]
): Record<string, ValidationResult> => {
  const validationResults: Record<string, ValidationResult> = {};

  formFields.forEach(field => {
    const fieldValue = formData[field.id] || '';
    const validationResult = validateField(
      fieldValue,
      field.type,
      field.validation || [],
      field.label
    );
    
    validationResults[field.id] = validationResult;
  });

  return validationResults;
};

/**
 * Checks if all validation results are valid
 * @param validationResults - Object containing validation results
 * @returns Boolean indicating if all validations passed
 */
export const isFormValid = (validationResults: Record<string, ValidationResult>): boolean => {
  return Object.values(validationResults).every(result => result.isValid);
};

/**
 * Gets the first validation error message from validation results
 * @param validationResults - Object containing validation results
 * @returns The first error message found, or null if no errors
 */
export const getFirstValidationError = (validationResults: Record<string, ValidationResult>): string | null => {
  for (const result of Object.values(validationResults)) {
    if (!result.isValid && result.message) {
      return result.message;
    }
  }
  return null;
};