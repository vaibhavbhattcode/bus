import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('metrics')
export class MetricsProcessor {
  private readonly logger = new Logger(MetricsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('api-metric')
  async handleApiMetric(job: Job) {
    const { method, url, statusCode, durationMs, userId } = job.data;
    try {
      await this.prisma.apiMetric.create({
        data: { method, url, statusCode, durationMs, userId: userId || undefined },
      });
    } catch (err) {
      this.logger.error(`Failed to write api-metric: ${err.message}`);
    }
  }

  @Process('access-log')
  async handleAccessLog(job: Job) {
    const { method, url, statusCode, durationMs, ipAddress, userAgent, browser, os, device, country, city, userId } = job.data;
    try {
      await this.prisma.accessLog.create({
        data: { method, url, statusCode, durationMs, ipAddress, userAgent, browser, os, device, country, city, userId: userId || undefined },
      });
    } catch (err) {
      this.logger.error(`Failed to write access-log: ${err.message}`);
    }
  }
}
