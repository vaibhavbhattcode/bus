import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FileUploadService } from './services/file-upload.service';
import { SystemSettingsService } from './services/system-settings.service';
import { IdempotencyService } from './services/idempotency.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { AdvancedCacheService } from './services/advanced-cache.service';
import { ApmService } from './services/apm.service';
import { MetricsProcessor } from './services/metrics.processor';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
    imports: [
        LoggerModule,
        PrismaModule,
        RedisModule,
        BullModule.registerQueue({ name: 'metrics' }),
    ],
    providers: [
        FileUploadService,
        SystemSettingsService,
        IdempotencyService,
        CircuitBreakerService,
        AdvancedCacheService,
        ApmService,
        MetricsProcessor,
    ],
    exports: [
        FileUploadService,
        SystemSettingsService,
        IdempotencyService,
        CircuitBreakerService,
        AdvancedCacheService,
        ApmService,
        LoggerModule,
        BullModule,
    ],
})
export class CommonModule { }
