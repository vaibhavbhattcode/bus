import { Module, Global } from '@nestjs/common';
import { FileUploadService } from './services/file-upload.service';
import { SystemSettingsService } from './services/system-settings.service';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
    imports: [LoggerModule, PrismaModule, RedisModule],
    providers: [FileUploadService, SystemSettingsService],
    exports: [FileUploadService, SystemSettingsService, LoggerModule],
})
export class CommonModule { }
