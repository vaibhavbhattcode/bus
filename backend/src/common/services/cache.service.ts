import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Advanced Caching Service
 * Implements intelligent caching strategies for high performance
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  /**
   * Cache with automatic serialization
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, ttl);
    } catch (error) {
      this.logger.error(`Cache set failed for key: ${key}`, error);
    }
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get<string>(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error(`Cache get failed for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Cache-aside pattern: Get from cache or execute function
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    this.logger.debug(`Cache MISS: ${key}`);
    const data = await fetchFn();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Invalidate cache by key pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.getKeys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.redis.del(key)));
        this.logger.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidation failed for pattern: ${pattern}`, error);
    }
  }

  /**
   * Invalidate multiple keys
   */
  async invalidate(...keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map(key => this.redis.del(key)));
      this.logger.debug(`Invalidated cache keys: ${keys.join(', ')}`);
    } catch (error) {
      this.logger.error('Cache invalidation failed', error);
    }
  }

  /**
   * Cache route search results
   */
  getCacheKey = {
    routeSearch: (from: string, to: string, date: string) => 
      `routes:search:${from}:${to}:${date}`,
    
    routeDetails: (id: string) => 
      `routes:details:${id}`,
    
    seatAvailability: (routeId: string) => 
      `routes:seats:${routeId}`,
    
    userBookings: (userId: string, page: number) => 
      `bookings:user:${userId}:${page}`,
    
    providerBookings: (providerId: string, page: number) => 
      `bookings:provider:${providerId}:${page}`,
    
    providerProfile: (providerId: string) => 
      `provider:profile:${providerId}`,
    
    userProfile: (userId: string) => 
      `user:profile:${userId}`,
    
    wallet: (userId: string) => 
      `wallet:${userId}`,
  };

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(): Promise<void> {
    this.logger.log('Cache warmup started...');
    // Implement warmup logic for critical data
    this.logger.log('Cache warmup completed');
  }
}
