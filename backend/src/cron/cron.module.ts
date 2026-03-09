import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { DynamicPricingService } from './dynamic-pricing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [CronService, DynamicPricingService],
  exports: [CronService, DynamicPricingService],
})
export class CronModule { }
