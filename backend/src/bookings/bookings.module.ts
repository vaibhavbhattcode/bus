import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { QrTicketService } from './qr-ticket.service';
import { SeatRecommendationService } from './seat-recommendation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { RedisModule } from '../redis/redis.module';
import { MailModule } from '../mail/mail.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ProvidersModule,
    PromoCodesModule,
    NotificationsModule,
    RedisModule,
    MailModule,
    ConfigModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, QrTicketService, SeatRecommendationService],
  exports: [BookingsService, QrTicketService, SeatRecommendationService],
})
export class BookingsModule { }
