import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  points: number;
  duration: number;
  keyPrefix?: string;
  blockDuration?: number;
}

@Injectable()
export class AdvancedRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AdvancedRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const identifier = this.getIdentifier(request);
    const key = `ratelimit:${options.keyPrefix || 'default'}:${identifier}`;

    const current = await this.redis.get<number>(key) || 0;

    if (current >= options.points) {
      const ttl = await this.redis.getTTL(key);
      this.logger.warn(`Rate limit exceeded for ${identifier}`);
      
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.redis.incr(key);
    
    if (current === 0) {
      await this.redis.expire(key, options.duration);
    }

    return true;
  }

  private getIdentifier(request: any): string {
    const userId = request.user?.id;
    const ip = request.ip || request.connection.remoteAddress;
    return userId || ip;
  }
}

export const RateLimit = (options: RateLimitOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
    return descriptor;
  };
};
