import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ApmService } from '../services/apm.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    private redis: RedisService,
    private apm: ApmService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      async () => {
        const isHealthy = await this.prisma.healthCheck();
        return {
          database: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
      async () => {
        try {
          await this.redis.get('health-check');
          return {
            redis: {
              status: 'up',
            },
          };
        } catch {
          return {
            redis: {
              status: 'down',
            },
          };
        }
      },
    ]);
  }

  @Get('metrics')
  getMetrics() {
    const bookingStats = this.apm.getStats('booking.create');
    const searchStats = this.apm.getStats('route.search');
    
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      bookings: bookingStats,
      search: searchStats,
      errors: this.apm.getErrors().slice(-10),
    };
  }

  @Get('ready')
  async readiness() {
    const dbHealthy = await this.prisma.healthCheck();
    
    if (!dbHealthy) {
      return { status: 'not_ready', reason: 'database_unavailable' };
    }

    return { status: 'ready' };
  }

  @Get('live')
  liveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}
