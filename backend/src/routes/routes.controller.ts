import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { SearchRoutesDto, ProviderRoutesFilterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProvidersService } from '../providers/providers.service';

@Controller('routes')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly providersService: ProvidersService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Req() req: any, @Body() createRouteDto: CreateRouteDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.create(provider.id, createRouteDto);
  }

  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  search(@Query() searchRoutesDto: SearchRoutesDto) {
    return this.routesService.search(searchRoutesDto);
  }

  @Get('provider/my-routes')
  @UseGuards(JwtAuthGuard)
  async getProviderRoutes(@Req() req: any, @Query() filters: ProviderRoutesFilterDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.findByProvider(provider.id, filters);
  }

  @Get(':id')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  findOne(@Param('id') id: string) {
    return this.routesService.findById(id);
  }

  @Get(':id/seats')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  getSeats(@Param('id') id: string) {
    return this.routesService.getSeatAvailability(id);
  }

  @Post(':id/lock-seats')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  lockSeats(@Req() req: any, @Param('id') id: string, @Body('seatNumbers') seatNumbers: string[]) {
    return this.routesService.lockSeats(id, seatNumbers, req.user.id);
  }

  @Post(':id/unlock-seats')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  unlockSeats(@Req() req: any, @Param('id') id: string, @Body('seatNumbers') seatNumbers: string[]) {
    return this.routesService.unlockSeats(id, seatNumbers, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.update(provider.id, id, updateRouteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Req() req: any, @Param('id') id: string) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.delete(provider.id, id);
  }
}
