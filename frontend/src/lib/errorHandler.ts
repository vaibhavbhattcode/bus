import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export interface ApiError {
  success?: boolean;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Axios error
    if ('response' in error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorData = axiosError.response?.data;
      
      if (errorData?.message) {
        return errorData.message;
      }
      
      // Handle validation errors
      if (errorData?.errors) {
        const firstError = Object.values(errorData.errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }
      }
      
      // HTTP status messages
      switch (axiosError.response?.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'You are not authorized. Please login again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return errorData?.message || 'This record already exists.';
        case 422:
          return errorData?.message || 'Validation failed. Please check your input.';
        case 429:
          return errorData?.message || 'Too many attempts. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return errorData?.message || 'An error occurred';
      }
    }
    
    // Network error
    if (error.message === 'Network Error' || error.message.includes('ERR_CONNECTION_REFUSED')) {
      return 'Cannot connect to server. Please check your internet connection.';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Get detailed error information
 */
export function getErrorDetails(error: unknown): ApiError | null {
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data || null;
  }
  return null;
}

/**
 * Show error toast with proper formatting
 */
export function showError(error: unknown, customMessage?: string): void {
  const message = customMessage || getErrorMessage(error);
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
}

/**
 * Show success toast
 */
export function showSuccess(message: string): void {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
}

/**
 * Show info toast
 */
export function showInfo(message: string): void {
  toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
  });
}

/**
 * Handle API errors with proper user feedback
 */
export function handleApiError(error: unknown, customMessage?: string): void {
  const errorDetails = getErrorDetails(error);
  
  // Don't show toast for 401 errors (handled by interceptor)
  if (errorDetails?.statusCode === 401) {
    return;
  }
  
  showError(error, customMessage);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors?: Record<string, string[]>): string[] {
  if (!errors) return [];
  
  return Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((msg) => `${field}: ${msg}`)
  );
}