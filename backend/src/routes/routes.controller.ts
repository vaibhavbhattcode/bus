import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { SearchRoutesDto } from './dto/search-routes.dto';
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
  async create(@Req() req, @Body() createRouteDto: CreateRouteDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.create(provider.id, createRouteDto);
  }

  @Get('search')
  search(@Query() searchRoutesDto: SearchRoutesDto) {
    return this.routesService.search(searchRoutesDto);
  }

  @Get('provider/my-routes')
  @UseGuards(JwtAuthGuard)
  async getProviderRoutes(@Req() req, @Query() filters: any) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.findByProvider(provider.id, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findById(id);
  }

  @Get(':id/seats')
  getSeats(@Param('id') id: string) {
    return this.routesService.getSeatAvailability(id);
  }

  @Post(':id/lock-seats')
  @UseGuards(JwtAuthGuard)
  lockSeats(@Req() req, @Param('id') id: string, @Body('seatNumbers') seatNumbers: string[]) {
    return this.routesService.lockSeats(id, seatNumbers, req.user.id);
  }

  @Post(':id/unlock-seats')
  @UseGuards(JwtAuthGuard)
  unlockSeats(@Req() req, @Param('id') id: string, @Body('seatNumbers') seatNumbers: string[]) {
    return this.routesService.unlockSeats(id, seatNumbers, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Req() req, @Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.update(provider.id, id, updateRouteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Req() req, @Param('id') id: string) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.routesService.delete(provider.id, id);
  }
}
