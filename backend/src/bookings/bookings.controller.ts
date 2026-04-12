import { Controller, Get, Post, Body, Put, Param, Query, UseGuards, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { QrTicketService } from './qr-ticket.service';
import { SeatRecommendationService } from './seat-recommendation.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProvidersService } from '../providers/providers.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly providersService: ProvidersService,
    private readonly qrTicketService: QrTicketService,
    private readonly seatRecommendation: SeatRecommendationService,
  ) { }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, createBookingDto);
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  findAll(@Query() filters: any) {
    return this.bookingsService.findAll(filters);
  }

  @Get('my')
  @Get('my-bookings')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  getMyBookings(@Req() req: any, @Query() filters: { page?: number; limit?: number }) {
    return this.bookingsService.findByUser(req.user.id, filters);
  }

  @Get('provider/my-bookings')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getProviderBookings(@Req() req: any, @Query() filters: any) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.bookingsService.findByProvider(provider.id, filters);
  }

  @Get(':id')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Put(':id/status')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: { status: string, paymentStatus?: string },
    @Req() req: any,
  ) {
    return this.bookingsService.updateStatus(id, body.status, body.paymentStatus, req.user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (with automatic refund calculation)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  cancel(@Param('id', ParseObjectIdPipe) id: string, @Body() body: { reason: string }) {
    return this.bookingsService.cancel(id, body.reason);
  }

  // ─────────────────────────────────────────────────────────────
  //  QR Digital Tickets
  // ─────────────────────────────────────────────────────────────

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Get QR ticket (base64 PNG) for a booking' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getTicket(@Param('id', ParseObjectIdPipe) id: string, @Req() req: any) {
    return this.qrTicketService.generateTicket(id, req.user.id);
  }

  @Post('verify-ticket')
  @ApiOperation({ summary: 'Verify scanned QR ticket (for conductor boarding check)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  verifyTicket(@Body('qrPayload') qrPayload: string) {
    return this.qrTicketService.verifyTicket(qrPayload);
  }

  // ─────────────────────────────────────────────────────────────
  //  Smart Seat Recommendation
  // ─────────────────────────────────────────────────────────────

  @Get('routes/:routeId/seat-recommend')
  @ApiOperation({ summary: 'Get AI seat recommendations based on your booking history' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  getSeatRecommendation(
    @Req() req: any,
    @Param('routeId') routeId: string,
    @Query('count', new DefaultValuePipe(1), ParseIntPipe) count: number,
  ) {
    return this.seatRecommendation.recommend(req.user.id, routeId, count);
  }

  @Post('seat-preferences')
  @ApiOperation({ summary: 'Save your seat preferences (window/aisle, front/back)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  saveSeatPreferences(
    @Req() req: any,
    @Body() prefs: { preferredSide?: string; preferredRow?: string; avoidLastRow?: boolean },
  ) {
    return this.seatRecommendation.savePreference(req.user.id, prefs);
  }
}

