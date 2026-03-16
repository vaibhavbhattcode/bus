import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('provider/earnings')
  async getProviderEarnings(
    @Req() req: any,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.reportsService.getProviderEarnings(req.user.id, period || 'month');
  }
}
