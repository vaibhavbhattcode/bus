import { Controller, Get, Post, Body, Put, Param, Query, UseGuards, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() filters: any) {
    return this.bookingsService.findAll(filters);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  getMyBookings(@Req() req, @Query() filters: { page?: number; limit?: number }) {
    return this.bookingsService.findByUser(req.user.id, filters);
  }

  @Get('provider/my-bookings')
  @UseGuards(JwtAuthGuard)
  async getProviderBookings(@Req() req, @Query() filters: any) {
    const provider = await this.providersService.findByUser(req.user.id);
    return this.bookingsService.findByProvider(provider.id, filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() body: { status: string, paymentStatus?: string }) {
    return this.bookingsService.updateStatus(id, body.status, body.paymentStatus);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (with automatic refund calculation)' })
  cancel(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.bookingsService.cancel(id, body.reason);
  }

  // ─────────────────────────────────────────────────────────────
  //  QR Digital Tickets
  // ─────────────────────────────────────────────────────────────

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Get QR ticket (base64 PNG) for a booking' })
  getTicket(@Param('id') id: string, @Req() req: any) {
    return this.qrTicketService.generateTicket(id, req.user.id);
  }

  @Post('verify-ticket')
  @ApiOperation({ summary: 'Verify scanned QR ticket (for conductor boarding check)' })
  verifyTicket(@Body('qrPayload') qrPayload: string) {
    return this.qrTicketService.verifyTicket(qrPayload);
  }

  // ─────────────────────────────────────────────────────────────
  //  Smart Seat Recommendation
  // ─────────────────────────────────────────────────────────────

  @Get('routes/:routeId/seat-recommend')
  @ApiOperation({ summary: 'Get AI seat recommendations based on your booking history' })
  getSeatRecommendation(
    @Req() req: any,
    @Param('routeId') routeId: string,
    @Query('count', new DefaultValuePipe(1), ParseIntPipe) count: number,
  ) {
    return this.seatRecommendation.recommend(req.user.id, routeId, count);
  }

  @Post('seat-preferences')
  @ApiOperation({ summary: 'Save your seat preferences (window/aisle, front/back)' })
  saveSeatPreferences(
    @Req() req: any,
    @Body() prefs: { preferredSide?: string; preferredRow?: string; avoidLastRow?: boolean },
  ) {
    return this.seatRecommendation.savePreference(req.user.id, prefs);
  }
}

