import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@Request() req, @Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(req.user.id, createAlertDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.alertsService.findAll(req.user.id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.alertsService.remove(req.user.id, id);
  }
}
