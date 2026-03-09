import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get<string>(key);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached) as T;
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache data
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const serialized = JSON.stringify(data);
      await this.redisService.set(key, serialized, ttl);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisService.getKeys(pattern);
      if (keys.length > 0) {
        // Delete keys one by one to avoid spread operator issues
        for (const key of keys) {
          await this.redisService.del(key);
        }
        this.logger.debug(`Cache cleared for pattern: ${pattern}, keys: ${keys.length}`);
      }
    } catch (error) {
      this.logger.error(`Error clearing cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Cache decorator for methods
   */
  cacheable(keyPrefix: string, options: CacheOptions = {}) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
        
        // Try to get from cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await method.apply(this, args);
        await this.cacheService.set(cacheKey, result, options);
        
        return result;
      };
    };
  }

  /**
   * Cache invalidation decorator
   */
  cacheInvalidate(pattern: string) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const result = await method.apply(this, args);
        
        // Clear cache after method execution
        await this.cacheService.clearPattern(pattern);
        
        return result;
      };
    };
  }

  /**
   * Generate cache key for entities
   */
  generateEntityKey(entity: string, id: string, suffix?: string): string {
    return suffix ? `${entity}:${id}:${suffix}` : `${entity}:${id}`;
  }

  /**
   * Generate cache key for lists
   */
  generateListKey(entity: string, params: Record<string, any> = {}): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${entity}:list:${paramString}`;
  }

  /**
   * Cache popular routes
   */
  async cachePopularRoutes(routes: any[]): Promise<void> {
    await this.set('routes:popular', routes, { ttl: 3600 }); // 1 hour
  }

  /**
   * Get popular routes from cache
   */
  async getPopularRoutes(): Promise<any[] | null> {
    return this.get<any[]>('routes:popular');
  }

  /**
   * Cache user notifications
   */
  async cacheUserNotifications(userId: string, notifications: any[]): Promise<void> {
    const key = this.generateEntityKey('notifications', userId);
    await this.set(key, notifications, { ttl: 300 }); // 5 minutes
  }

  /**
   * Get user notifications from cache
   */
  async getUserNotifications(userId: string): Promise<any[] | null> {
    const key = this.generateEntityKey('notifications', userId);
    return this.get<any[]>(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query: string, results: any[]): Promise<void> {
    const key = this.generateEntityKey('search', query);
    await this.set(key, results, { ttl: 1800 }); // 30 minutes
  }

  /**
   * Get search results from cache
   */
  async getSearchResults(query: string): Promise<any[] | null> {
    const key = this.generateEntityKey('search', query);
    return this.get<any[]>(key);
  }
}
