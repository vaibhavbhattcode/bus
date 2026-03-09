import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly service: ExperimentsService) {}

  @Get('promotions')
  list(@Query('segment') segment?: string) {
    return this.service.listActive(segment);
  }

  @Post('events')
  @UseGuards(JwtAuthGuard)
  record(@Request() req, @Body() body: { experimentId: string; variant: string; eventType: string; route?: string }) {
    return this.service.recordEvent({
      experimentId: body.experimentId,
      userId: req.user.id,
      variant: body.variant,
      eventType: body.eventType,
      route: body.route,
    });
  }
}
