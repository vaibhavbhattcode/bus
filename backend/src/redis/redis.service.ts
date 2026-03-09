import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

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
}
