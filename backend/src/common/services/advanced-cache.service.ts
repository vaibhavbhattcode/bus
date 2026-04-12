import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  tags?: string[];
}

@Injectable()
export class AdvancedCacheService {
  private readonly logger = new Logger(AdvancedCacheService.name);
  private readonly defaultTTL = 300; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix);
    return this.redis.get<T>(fullKey);
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix);
    const ttl = options?.ttl || this.defaultTTL;
    
    await this.redis.set(fullKey, value, ttl);

    if (options?.tags) {
      await this.tagKey(fullKey, options.tags);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async invalidate(key: string, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix);
    await this.redis.del(fullKey);
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const keys = await this.redis.get<string[]>(tagKey);
    
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => this.redis.del(key)));
      await this.redis.del(tagKey);
      this.logger.log(`Invalidated ${keys.length} keys with tag: ${tag}`);
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.getKeys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => this.redis.del(key)));
      this.logger.log(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
    }
  }

  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    const fullKeys = keys.map(k => this.buildKey(k, options?.prefix));
    return Promise.all(fullKeys.map(k => this.redis.get<T>(k)));
  }

  async mset<T>(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<void> {
    await Promise.all(
      entries.map(({ key, value }) => this.set(key, value, options)),
    );
  }

  private buildKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  private async tagKey(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const existingKeys = await this.redis.get<string[]>(tagKey) || [];
      if (!existingKeys.includes(key)) {
        existingKeys.push(key);
        await this.redis.set(tagKey, existingKeys, 86400); // 24h TTL for tags
      }
    }
  }

  async warmup<T>(
    keys: string[],
    factory: (key: string) => Promise<T>,
    options?: CacheOptions,
  ): Promise<void> {
    this.logger.log(`Warming up cache for ${keys.length} keys`);
    await Promise.all(
      keys.map(async key => {
        const value = await factory(key);
        await this.set(key, value, options);
      }),
    );
  }
}
