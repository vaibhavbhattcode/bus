import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { ProviderAnalyticsService } from './provider-analytics.service';
import { WebhookService } from './webhook.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly analytics: ProviderAnalyticsService,
    private readonly webhooks: WebhookService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(req.user.id, createProviderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  register(@Req() req, @Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(req.user.id, createProviderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return this.providersService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@Req() req, @Body() updateProviderDto: UpdateProviderDto) {
    return this.providersService.update(req.user.id, updateProviderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vehicles')
  async getVehicles(@Req() req) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.providersService.getVehicles(provider.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('vehicles')
  async createVehicle(@Req() req, @Body() createVehicleDto: CreateVehicleDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.providersService.createVehicle(provider.id, createVehicleDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('vehicles/:id')
  async updateVehicle(@Req() req, @Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.providersService.updateVehicle(provider.id, id, updateVehicleDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('vehicles/:id')
  async deleteVehicle(@Req() req, @Param('id') id: string) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.providersService.deleteVehicle(provider.id, id);
  }

  // ─────────────────────────────────────────────────────────────
  //  Analytics Dashboard
  // ─────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Get provider analytics dashboard (revenue, utilization, top routes, peak hours)' })
  async getAnalytics(@Req() req: any) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.analytics.getDashboard(provider.id);
  }

  // ─────────────────────────────────────────────────────────────
  //  Webhook Management
  // ─────────────────────────────────────────────────────────────

  @Post('webhooks')
  @ApiOperation({ summary: 'Subscribe to booking events via webhook' })
  async subscribeWebhook(
    @Req() req: any,
    @Body() body: { url: string; events: string[] },
  ) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.webhooks.subscribe(provider.id, body.url, body.events);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhook subscriptions' })
  async listWebhooks(@Req() req: any) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.webhooks.listSubscriptions(provider.id);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  async deleteWebhook(@Req() req: any, @Param('id') id: string) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.webhooks.deleteSubscription(provider.id, id);
  }
}

