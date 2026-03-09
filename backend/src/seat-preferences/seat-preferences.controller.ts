import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SeatPreferencesService } from './seat-preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

class UpsertPreferenceDto {
    @IsOptional()
    @IsString()
    preferredSide?: string;

    @IsOptional()
    @IsString()
    preferredRow?: string;

    @IsOptional()
    @IsBoolean()
    avoidLastRow?: boolean;
}

@ApiTags('Seat Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seat-preferences')
export class SeatPreferencesController {
    constructor(private readonly seatPreferencesService: SeatPreferencesService) { }

    @Get()
    @ApiOperation({ summary: 'Get current user seat preferences' })
    getPreference(@Req() req: any) {
        return this.seatPreferencesService.getPreference(req.user.id);
    }

    @Put()
    @ApiOperation({ summary: 'Update or create seat preferences' })
    upsertPreference(@Req() req: any, @Body() dto: UpsertPreferenceDto) {
        return this.seatPreferencesService.upsertPreference(req.user.id, dto);
    }
}
