import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProviderStatsGateway } from './provider-stats.gateway';
import { ProviderAnalyticsService } from './provider-analytics.service';
import { WebhookService } from './webhook.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderStatsGateway, ProviderAnalyticsService, WebhookService],
  exports: [ProvidersService, ProviderAnalyticsService, WebhookService],
})
export class ProvidersModule { }
