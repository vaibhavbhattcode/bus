import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from 'prisma-client-custom';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
    });

    // Query performance monitoring
    this.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      const duration = after - before;

      if (duration > 1000) {
        this.logger.warn(
          `Slow query detected: ${params.model}.${params.action} took ${duration}ms`,
        );
      }

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$runCommandRaw({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // Batch operations helper
  async batchWrite<T>(
    operations: Array<() => Promise<T>>,
    batchSize = 100,
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    return results;
  }
}
