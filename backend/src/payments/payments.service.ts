import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_placeholder',
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'secret_placeholder',
    });
  }

  async createOrder(amount: number) {
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return {
        ...order,
        orderId: order.id,
        keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      this.logger.error('Error creating payment order', error);
      throw new BadRequestException('Could not create payment order');
    }
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'secret_placeholder')
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  async processRefund(paymentId: string, amount: number) {
    try {
      if (!paymentId) {
        throw new BadRequestException('Payment ID is required for refund');
      }
      
      // If we are using a test key/mock, we can mock the refund response
      const isTest = this.configService.get<string>('RAZORPAY_KEY_ID') === 'rzp_test_placeholder';
      if (isTest) {
        this.logger.log(`[MOCK] Refund processed for payment ${paymentId} amount ${amount}`);
        return {
          id: `rfnd_${Date.now()}`,
          payment_id: paymentId,
          amount: Math.round(amount * 100),
          status: 'processed'
        };
      }

      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100), // Amount in paise
        speed: 'normal',
      });
      
      this.logger.log(`Refund processed for payment ${paymentId}: ${JSON.stringify(refund)}`);
      return refund;
    } catch (error) {
      this.logger.error(`Error processing refund for payment ${paymentId}`, error);
      throw new BadRequestException('Refund processing failed: ' + (error.error?.description || error.message));
    }
  }
}
