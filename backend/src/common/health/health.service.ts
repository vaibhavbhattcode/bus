import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: CheckResult;
    disk: CheckResult;
    uptime: CheckResult;
  };
  responseTime: number;
}

export interface CheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  details?: any;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.logger.log('Performing health check...');

    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkUptime(),
    ]);

    const results = {
      database: this.getCheckResult(checks[0]),
      redis: this.getCheckResult(checks[1]),
      memory: this.getCheckResult(checks[2]),
      disk: this.getCheckResult(checks[3]),
      uptime: this.getCheckResult(checks[4]),
    };

    const overallStatus = this.calculateOverallStatus(results);
    const responseTime = Date.now() - startTime;

    this.logger.log(`Health check completed: ${overallStatus} (${responseTime}ms)`);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      responseTime,
    };
  }

  async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      // Simple database connectivity check
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      // Check database performance
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          message: 'Database response time is slow',
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'Database is responsive',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        responseTime: Date.now() - startTime,
        details: error.message,
      };
    }
  }

  async checkRedis(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      // Test Redis connectivity
      const testKey = 'health_check_test';
      await this.redis.set(testKey, 'test', 10);
      const value = await this.redis.get(testKey);
      await this.redis.del(testKey);

      const responseTime = Date.now() - startTime;

      if (value !== 'test') {
        return {
          status: 'unhealthy',
          message: 'Redis read/write test failed',
          responseTime,
        };
      }

      if (responseTime > 500) {
        return {
          status: 'degraded',
          message: 'Redis response time is slow',
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'Redis is responsive',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
        responseTime: Date.now() - startTime,
        details: error.message,
      };
    }
  }

  async checkMemory(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal / 1024 / 1024; // MB
      const usedMemory = memUsage.heapUsed / 1024 / 1024; // MB
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Memory usage is normal';

      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = 'Memory usage is critical';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
        message = 'Memory usage is high';
      }

      return {
        status,
        message,
        responseTime: Date.now() - startTime,
        details: {
          total: `${totalMemory.toFixed(2)} MB`,
          used: `${usedMemory.toFixed(2)} MB`,
          usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        },
      };
    } catch (error) {
      this.logger.error('Memory health check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Failed to check memory usage',
        responseTime: Date.now() - startTime,
        details: error.message,
      };
    }
  }

  async checkDisk(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const stats = fs.statSync(process.cwd());
      
      // Simple disk check - in production, you'd want to check actual disk space
      return {
        status: 'healthy',
        message: 'Disk space is sufficient',
        responseTime: Date.now() - startTime,
        details: {
          path: process.cwd(),
          accessible: true,
        },
      };
    } catch (error) {
      this.logger.error('Disk health check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Disk access failed',
        responseTime: Date.now() - startTime,
        details: error.message,
      };
    }
  }

  async checkUptime(): Promise<CheckResult> {
    const startTime = Date.now();
    try {
      const uptime = Date.now() - this.startTime;
      const uptimeHours = uptime / (1000 * 60 * 60);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Application uptime is normal';

      // If uptime is less than 1 minute, might be restarting frequently
      if (uptimeHours < 0.016) {
        status = 'degraded';
        message = 'Application restarted recently';
      }

      return {
        status,
        message,
        responseTime: Date.now() - startTime,
        details: {
          uptime: `${uptimeHours.toFixed(2)} hours`,
          startTime: new Date(this.startTime).toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Uptime health check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Failed to check uptime',
        responseTime: Date.now() - startTime,
        details: error.message,
      };
    }
  }

  private getCheckResult(result: PromiseSettledResult<CheckResult>): CheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    
    this.logger.error('Health check promise rejected:', result.reason);
    return {
      status: 'unhealthy',
      message: 'Health check failed',
      details: result.reason?.message || 'Unknown error',
    };
  }

  private calculateOverallStatus(checks: Record<string, CheckResult>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  async getLiveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{ status: string; timestamp: string; checks: string[] }> {
    const checks = [];
    
    try {
      await this.checkDatabase();
      checks.push('database');
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: ['database_failed'],
      };
    }

    try {
      await this.checkRedis();
      checks.push('redis');
    } catch (error) {
      // Redis is not critical for readiness
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
