import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { BookingsService } from '../bookings/bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Post('create-order')
  async createOrder(@Body() body: { amount: number }) {
    return this.paymentsService.createOrder(body.amount);
  }

  @Post('verify')
  async verifyPayment(
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      bookingId: string;
    },
  ) {
    const isValid = this.paymentsService.verifyPayment(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
    );

    if (isValid) {
      // Update booking status
      await this.bookingsService.markAsPaid(body.bookingId, body.razorpay_payment_id);
      return { success: true, message: 'Payment verified and booking confirmed' };
    } else {
      throw new BadRequestException('Invalid payment signature');
    }
  }
}
