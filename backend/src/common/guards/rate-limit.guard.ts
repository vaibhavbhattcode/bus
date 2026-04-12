import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { RateLimitExceededException } from '../exceptions';
import { RATE_LIMIT_KEY, RateLimitConfig } from '../decorators/rate-limit.decorator';

/**
 * Rate Limit Guard
 * Implements distributed rate limiting using Redis
 * Supports multiple key types: IP, user, email, phone, custom
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request, config);

    if (!key) {
      this.logger.warn('Could not generate rate limit key, allowing request');
      return true;
    }

    const rateLimitKey = `ratelimit:${key}`;
    
    // Get current count
    const current = await this.redisService.get<number>(rateLimitKey);
    const count = current || 0;

    if (count >= config.limit) {
      const ttl = await this.redisService.getTTL(rateLimitKey);
      const retryAfter = ttl > 0 ? ttl : config.window;
      
      this.logger.warn(
        `Rate limit exceeded for key: ${key} (${count}/${config.limit})`,
      );
      
      throw new RateLimitExceededException(
        config.message || 'Too many requests',
        retryAfter,
      );
    }

    // Increment counter
    if (count === 0) {
      // First request in window - set with TTL
      await this.redisService.set(rateLimitKey, 1, config.window);
    } else {
      // Subsequent request - increment
      await this.redisService.incr(rateLimitKey);
    }

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', config.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, config.limit - count - 1));
    response.setHeader('X-RateLimit-Reset', Date.now() + config.window * 1000);

    return true;
  }

  /**
   * Generate rate limit key based on configuration
   */
  private generateKey(request: any, config: RateLimitConfig): string | null {
    const { keyType, keyExtractor } = config;

    if (keyExtractor) {
      return keyExtractor(request);
    }

    switch (keyType) {
      case 'ip':
        return this.getClientIp(request);
      
      case 'user':
        return request.user?.id || null;
      
      case 'email':
        return request.body?.email || request.query?.email || null;
      
      case 'phone':
        return request.body?.phone || request.query?.phone || null;
      
      default:
        return this.getClientIp(request);
    }
  }

  /**
   * Extract client IP address (handles proxies)
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
