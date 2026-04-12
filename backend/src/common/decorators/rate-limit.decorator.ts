import { SetMetadata } from '@nestjs/common';

/**
 * Rate Limit Configuration Interface
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Rate limit key type: 'ip' | 'user' | 'email' | 'phone' */
  keyType?: 'ip' | 'user' | 'email' | 'phone' | 'custom';
  /** Custom key extractor function */
  keyExtractor?: (req: any) => string;
  /** Error message to show when rate limit exceeded */
  message?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate Limit Decorator
 * 
 * Usage:
 * @RateLimit({ limit: 5, window: 900, keyType: 'ip' }) // 5 requests per 15 minutes per IP
 * @RateLimit({ limit: 3, window: 3600, keyType: 'email' }) // 3 requests per hour per email
 */
export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

/**
 * Predefined Rate Limit Configurations
 */
export const RateLimits = {
  /** Login: 5 attempts per 15 minutes per IP AND per email */
  LOGIN: { limit: 5, window: 900, keyType: 'ip' as const },
  LOGIN_EMAIL: { limit: 5, window: 900, keyType: 'email' as const },
  
  /** Register: 3 per hour per IP */
  REGISTER: { limit: 3, window: 3600, keyType: 'ip' as const },
  
  /** OTP: 3 per hour per phone */
  OTP_SEND: { limit: 3, window: 3600, keyType: 'phone' as const },
  
  /** Forgot Password: 3 per hour per email */
  FORGOT_PASSWORD: { limit: 3, window: 3600, keyType: 'email' as const },
  
  /** Payment: 10 per minute per user */
  PAYMENT: { limit: 10, window: 60, keyType: 'user' as const },
  
  /** General API: 100 per minute per IP */
  GENERAL: { limit: 100, window: 60, keyType: 'ip' as const },
};
