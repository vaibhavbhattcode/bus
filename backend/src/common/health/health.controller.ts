import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult, HealthCheckResult } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prisma: PrismaService,
        private redisService: RedisService,
    ) { }

    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Check system health (DB, Redis, memory)' })
    async check(): Promise<HealthCheckResult> {
        return this.health.check([
            // Database connectivity
            async (): Promise<HealthIndicatorResult> => {
                try {
                    await this.prisma.$runCommandRaw({ ping: 1 });
                    return { database: { status: 'up' } };
                } catch {
                    return { database: { status: 'down', message: 'Cannot reach MongoDB' } };
                }
            },
            // Redis connectivity
            async (): Promise<HealthIndicatorResult> => {
                try {
                    await this.redisService.get('__health__');
                    return { redis: { status: 'up' } };
                } catch {
                    return { redis: { status: 'down', message: 'Cannot reach Redis' } };
                }
            },
            // Memory check
            async (): Promise<HealthIndicatorResult> => {
                const { heapUsed, rss } = process.memoryUsage();
                const heapMB = Math.round(heapUsed / 1024 / 1024);
                return {
                    memory: {
                        status: heapMB < 512 ? 'up' : 'down',
                        heapUsedMB: heapMB,
                        rssMB: Math.round(rss / 1024 / 1024),
                    },
                };
            },
        ]);
    }
}

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check system health (DB, Redis, memory, disk, uptime)' })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.checkHealth();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe - basic health check' })
  async liveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - check if app is ready to serve traffic' })
  async readiness() {
    return this.healthService.getReadiness();
  }
}
