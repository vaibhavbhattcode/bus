import { Transform } from 'class-transformer';

/**
 * Sanitizes string input by trimming whitespace and removing potentially dangerous characters
 * Use this decorator on all user input fields to prevent XSS attacks
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // Trim whitespace
    let sanitized = value.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    return sanitized;
  });
}

/**
 * Sanitizes HTML input by escaping dangerous characters
 * Use this for fields that may contain user-generated content displayed as HTML
 */
export function SanitizeHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  });
}

/**
 * Strips all HTML tags from input
 * Use this for fields that should never contain HTML
 */
export function StripHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // Remove HTML tags
    let sanitized = value.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    sanitized = sanitized
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&amp;/g, '&');
    
    return sanitized.trim();
  });
}

/**
 * Normalizes phone numbers by removing all non-digit characters
 */
export function SanitizePhone() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.replace(/\D/g, '');
  });
}

/**
 * Normalizes email addresses to lowercase and trims whitespace
 */
export function SanitizeEmail() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  });
}

/**
 * Sanitizes search queries to prevent injection attacks
 */
export function SanitizeSearchQuery() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // Remove special regex characters
    return value
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .substring(0, 100); // Limit length
  });
}
