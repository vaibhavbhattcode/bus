import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('metrics')
export class MetricsController {
  constructor(private prisma: PrismaService) {}

  @Get('summary')
  async summary(@Query('window') window = '3600') {
    const seconds = Number(window);
    const since = new Date(Date.now() - seconds * 1000);
    const metrics = await this.prisma.apiMetric.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    const total = metrics.length;
    const avgDuration =
      total > 0 ? Math.round(metrics.reduce((sum, m) => sum + m.durationMs, 0) / total) : 0;
    const errorCount = metrics.filter((m) => m.statusCode >= 400).length;
    const errorRate = total > 0 ? Number(((errorCount / total) * 100).toFixed(2)) : 0;

    return {
      totalRequests: total,
      avgDurationMs: avgDuration,
      errorRatePercent: errorRate,
      windowSeconds: seconds,
    };
  }
}
