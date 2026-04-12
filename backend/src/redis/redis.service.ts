import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Cache TTL Constants (seconds)
 * Single source of truth for all cache durations
 */
export const CACHE_TTL = {
  ROUTE_SEARCH: 300,           // 5 minutes - route search results
  PROVIDER_STATS: 60,          // 1 minute - provider statistics
  ADMIN_ANALYTICS: 120,        // 2 minutes - admin analytics
  SEAT_AVAILABILITY: 10,       // 10 seconds - critical, changes frequently
  USER_PROFILE: 300,           // 5 minutes - user profile data
  PROMO_CODE: 600,             // 10 minutes - promo code validation
  POPULAR_ROUTES: 3600,        // 1 hour - popular routes list
  SYSTEM_SETTINGS: 1800,       // 30 minutes - system settings
} as const;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);
  private isReady = false;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    const url = password
      ? `redis://:${password}@${host}:${port}`
      : `redis://${host}:${port}`;

    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            this.logger.error('Redis connection failed after 5 retries. Redis features will be disabled.');
            this.isReady = false;
            return false; // stop retrying
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      // Only log if we were previously ready or if it's a new serious error
      if (this.isReady) {
        this.logger.error('Redis Client Error', err);
      }
      this.isReady = false;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connecting...');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('Redis Client Ready');
    });

    this.client.on('end', () => {
      this.isReady = false;
      this.logger.warn('Redis Client Connection Ended');
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn('Initial Redis connection failed. Redis features will be disabled until connection is established.');
      this.isReady = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  async set(key: string, value: any, ttl?: number) {
    if (!this.isReady) return;
    try {
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await this.client.set(key, data, { EX: ttl });
      } else {
        await this.client.set(key, data);
      }
    } catch (err) {
      this.logger.error(`Error setting key ${key} in Redis`, err);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (err) {
      this.logger.error(`Error getting key ${key} from Redis`, err);
      return null;
    }
  }

  async del(key: string) {
    if (!this.isReady) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`Error deleting key ${key} from Redis`, err);
    }
  }

  async setLock(key: string, value: string, ttl: number): Promise<boolean> {
    if (!this.isReady) {
      this.logger.error(`Cannot lock ${key}: Redis is down (Failing Closed)`);
      return false; // Fail closed to prevent double booking
    }
    try {
      const result = await this.client.set(key, value, {
        NX: true,
        EX: ttl,
      });
      return result === 'OK';
    } catch (err) {
      this.logger.error(`Error setting lock for ${key} in Redis`, err);
      return false; // Fail closed
    }
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    if (!this.isReady) return false;
    try {
      const currentValue = await this.client.get(key);
      if (currentValue === value) {
        await this.client.del(key);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`Error releasing lock for ${key} in Redis`, err);
      return false;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isReady) return [];
    try {
      return await this.client.keys(pattern);
    } catch (err) {
      this.logger.error(`Error getting keys with pattern ${pattern} from Redis`, err);
      return [];
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isReady) return 0;
    try {
      return await this.client.incr(key);
    } catch (err) {
      this.logger.error(`Error incrementing key ${key} in Redis`, err);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isReady) return false;
    try {
      return await this.client.expire(key, seconds);
    } catch (err) {
      this.logger.error(`Error setting expiry for key ${key} in Redis`, err);
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    if (!this.isReady) return -1;
    try {
      return await this.client.ttl(key);
    } catch (err) {
      this.logger.error(`Error getting TTL for key ${key} from Redis`, err);
      return -1;
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Cache Helper Methods (Cache-Aside Pattern)
  // ─────────────────────────────────────────────────────────────

  /**
   * Cache-aside pattern: Get from cache or execute function and cache result
   * @param key Cache key
   * @param ttl Time to live in seconds
   * @param fetchFn Function to execute if cache miss
   */
  async getOrSet<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    const data = await fetchFn();
    
    // Store in cache (fire and forget)
    this.set(key, data, ttl).catch((err) => {
      this.logger.warn(`Failed to cache key ${key}`, err);
    });

    return data;
  }

  /**
   * Invalidate multiple cache keys by pattern
   * @param pattern Redis key pattern (e.g., 'route:*')
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isReady) return 0;
    
    try {
      const keys = await this.getKeys(pattern);
      if (keys.length === 0) return 0;
      
      await Promise.all(keys.map((key) => this.del(key)));
      this.logger.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (err) {
      this.logger.error(`Error invalidating pattern ${pattern}`, err);
      return 0;
    }
  }

  /**
   * Generate cache key with hash for complex query params
   * @param prefix Key prefix (e.g., 'routes:search')
   * @param params Query parameters object
   */
  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < sortedParams.length; i++) {
      const char = sortedParams.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${prefix}:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Batch get multiple keys
   * @param keys Array of cache keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isReady || keys.length === 0) return keys.map(() => null);
    
    try {
      const values = await this.client.mGet(keys);
      return values.map((val) => {
        if (!val) return null;
        try {
          return JSON.parse(val) as T;
        } catch {
          return val as unknown as T;
        }
      });
    } catch (err) {
      this.logger.error(`Error batch getting keys from Redis`, err);
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple key-value pairs
   * @param entries Array of [key, value, ttl?] tuples
   */
  async mset(entries: Array<[string, any, number?]>): Promise<void> {
    if (!this.isReady || entries.length === 0) return;
    
    try {
      await Promise.all(
        entries.map(([key, value, ttl]) => this.set(key, value, ttl))
      );
    } catch (err) {
      this.logger.error(`Error batch setting keys in Redis`, err);
    }
  }
}
