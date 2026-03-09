import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('cities')
  async searchCities(@Query('q') query: string) {
    return this.locationsService.searchCities(query);
  }

  @Get('search')
  async searchAddress(@Query('q') query: string) {
    return this.locationsService.searchAddress(query);
  }

  @Get('popular-routes')
  async popularRoutes(@Query('q') query: string) {
    return this.locationsService.popularRoutes(query);
  }
}
