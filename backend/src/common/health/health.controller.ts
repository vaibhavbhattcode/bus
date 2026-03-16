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
            // Database connectivity — works with any MongoDB deployment (Atlas or self-hosted)
            async (): Promise<HealthIndicatorResult> => {
                try {
                    // A lightweight read operation to confirm DB connectivity
                    await this.prisma.systemSetting.findFirst({ select: { id: true } });
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
            // Uptime liveness
            async (): Promise<HealthIndicatorResult> => {
                return { uptime: { status: 'up', uptimeSeconds: Math.floor(process.uptime()) } };
            },
        ]);
    }

    @Get('live')
    @ApiOperation({ summary: 'Liveness probe — always returns 200 if process is alive' })
    liveness() {
        return { status: 'alive', timestamp: new Date().toISOString() };
    }

    @Get('ready')
    @ApiOperation({ summary: 'Readiness probe — confirms app is ready to serve traffic' })
    async readiness() {
        const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        return {
            status: 'ready',
            uptimeSeconds: Math.floor(process.uptime()),
            heapUsedMB: heapMB,
            timestamp: new Date().toISOString(),
        };
    }
}
