import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('price')
  createPriceAlert(@Request() req, @Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(req.user.id, createAlertDto);
  }

  @Get('my-alerts')
  findAllAlerts(@Request() req) {
    return this.alertsService.findAll(req.user.id);
  }

  @Delete(':id')
  removeAlert(@Request() req, @Param('id') id: string) {
    return this.alertsService.remove(req.user.id, id);
  }

  @Get('favorite-routes')
  getFavorites(@Request() req) {
    return this.alertsService.findFavorites(req.user.id);
  }

  @Post('favorite-route')
  addFavorite(@Request() req, @Body() body: { fromCity: string; toCity: string }) {
    return this.alertsService.addFavorite(req.user.id, body.fromCity, body.toCity);
  }

  @Delete('favorite-route/:id')
  removeFavorite(@Request() req, @Param('id') id: string) {
    return this.alertsService.removeFavorite(req.user.id, id);
  }
}
