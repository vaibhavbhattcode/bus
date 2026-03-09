import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { RoutesModule } from './routes/routes.module';
import { BookingsModule } from './bookings/bookings.module';
import { AdminModule } from './admin/admin.module';
import { AlertsModule } from './alerts/alerts.module';
import { BlogModule } from './blog/blog.module';
import { CronModule } from './cron/cron.module';
import { FeedbackModule } from './feedback/feedback.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { RedisModule } from './redis/redis.module';
import { ReportsModule } from './reports/reports.module';
import { SupportModule } from './support/support.module';
import { MailModule } from './mail/mail.module';
import { LocationsModule } from './locations/locations.module';
import { TrackingModule } from './tracking/tracking.module';
import { ApiMetricsInterceptor } from './common/interceptors/api-metrics.interceptor';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { DestinationsModule } from './destinations/destinations.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { MetricsModule } from './metrics/metrics.module';
import { AccessLoggerMiddleware } from './common/middlewares/access-logger.middleware';
import { BullModule } from '@nestjs/bull';
import { HealthModule } from './common/health/health.module';
import { WalletModule } from './wallet/wallet.module';
import { SeatPreferencesModule } from './seat-preferences/seat-preferences.module';

@Module({
  imports: [
    // Environment variable validation – app fails fast on missing required vars
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).default(Joi.ref('JWT_SECRET')),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        SMTP_HOST: Joi.string().optional(),
        SMTP_PORT: Joi.number().default(587),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
      }),
    }),
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000,
      limit: 100,
    }, {
      name: 'short',
      ttl: 1000,
      limit: 3,
    }, {
      name: 'auth',
      ttl: 60000,
      limit: 5,
    }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    PrismaModule,
    MailModule,
    LocationsModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    RoutesModule,
    BookingsModule,
    AdminModule,
    AlertsModule,
    BlogModule,
    CronModule,
    FeedbackModule,
    NotificationsModule,
    PaymentsModule,
    PromoCodesModule,
    RedisModule,
    ReportsModule,
    SupportModule,
    TrackingModule,
    FeatureFlagsModule,
    DestinationsModule,
    ExperimentsModule,
    MetricsModule,
    HealthModule,
    WalletModule,
    SeatPreferencesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiMetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLoggerMiddleware).forRoutes('*');
  }
}
