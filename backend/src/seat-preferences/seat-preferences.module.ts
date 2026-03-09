import { Module } from '@nestjs/common';
import { SeatPreferencesService } from './seat-preferences.service';
import { SeatPreferencesController } from './seat-preferences.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SeatPreferencesController],
    providers: [SeatPreferencesService],
    exports: [SeatPreferencesService],
})
export class SeatPreferencesModule { }
