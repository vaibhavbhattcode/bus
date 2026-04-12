import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly TTL = 86400; // 24 hours

  constructor(private readonly redis: RedisService) {}

  async checkAndStore(key: string, value: any): Promise<{ isNew: boolean; data?: any }> {
    const existingValue = await this.redis.get<any>(`idempotency:${key}`);
    
    if (existingValue) {
      this.logger.log(`Idempotency key ${key} already exists - returning cached result`);
      return { isNew: false, data: existingValue };
    }

    await this.redis.set(`idempotency:${key}`, value, this.TTL);
    return { isNew: true };
  }

  async get(key: string): Promise<any> {
    return this.redis.get<any>(`idempotency:${key}`);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`idempotency:${key}`);
  }
}
