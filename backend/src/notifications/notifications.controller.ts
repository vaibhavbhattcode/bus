import { Controller, Get, Put, Delete, Param, UseGuards, Request, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Body, BadRequestException } from '@nestjs/common';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Put('mark-all-read')
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Put(':id/read')
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.notificationsService.remove(req.user.id, id);
  }

  @Post('device-token')
  async registerDeviceToken(
    @Request() req,
    @Body('token') token: string,
    @Body('device') device?: string,
  ) {
    if (!token) throw new BadRequestException('FCM token is required');
    await this.notificationsService.registerDeviceToken(req.user.id, token, device);
    return { success: true, message: 'Device token registered successfully' };
  }

  @Delete('device-token/:token')
  async unregisterDeviceToken(@Param('token') token: string) {
    await this.notificationsService.unregisterDeviceToken(token);
    return { success: true, message: 'Device token unregistered' };
  }
}
