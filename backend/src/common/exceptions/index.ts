import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Custom Exception Classes for Domain-Specific Errors
 * These provide better semantic meaning and appropriate HTTP status codes
 */

export class InsufficientSeatsException extends ConflictException {
  constructor(requestedSeats: number, availableSeats: number) {
    super({
      code: 'INSUFFICIENT_SEATS',
      message: `Cannot book ${requestedSeats} seats. Only ${availableSeats} seats available.`,
      requestedSeats,
      availableSeats,
    });
  }
}

export class ProviderSuspendedException extends ForbiddenException {
  constructor(providerId: string, reason?: string) {
    super({
      code: 'PROVIDER_SUSPENDED',
      message: 'Your provider account has been suspended. Please contact support.',
      providerId,
      reason,
    });
  }
}

export class BookingWindowExpiredException extends BadRequestException {
  constructor(departureTime: Date) {
    super({
      code: 'BOOKING_WINDOW_EXPIRED',
      message: 'Booking window has expired. Cannot book tickets for past or imminent departures.',
      departureTime: departureTime.toISOString(),
    });
  }
}

export class PaymentVerificationFailedException extends UnprocessableEntityException {
  constructor(paymentId: string, reason: string) {
    super({
      code: 'PAYMENT_VERIFICATION_FAILED',
      message: 'Payment verification failed. Please contact support if amount was deducted.',
      paymentId,
      reason,
    });
  }
}

export class TokenRevokedException extends UnauthorizedException {
  constructor() {
    super({
      code: 'TOKEN_REVOKED',
      message: 'Your session has been revoked. Please login again.',
    });
  }
}

export class SeatAlreadyBookedException extends ConflictException {
  constructor(seatNumbers: string[]) {
    super({
      code: 'SEAT_ALREADY_BOOKED',
      message: 'One or more selected seats are no longer available.',
      seatNumbers,
    });
  }
}

export class InvalidPromoCodeException extends BadRequestException {
  constructor(code: string, reason: string) {
    super({
      code: 'INVALID_PROMO_CODE',
      message: `Promo code "${code}" is invalid: ${reason}`,
      promoCode: code,
      reason,
    });
  }
}

export class WalletInsufficientBalanceException extends BadRequestException {
  constructor(required: number, available: number) {
    super({
      code: 'WALLET_INSUFFICIENT_BALANCE',
      message: `Insufficient wallet balance. Required: ₹${required}, Available: ₹${available}`,
      required,
      available,
    });
  }
}

export class RateLimitExceededException extends BadRequestException {
  constructor(action: string, retryAfter: number) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many ${action} attempts. Please try again after ${retryAfter} seconds.`,
      action,
      retryAfter,
    });
  }
}

export class OTPExpiredException extends BadRequestException {
  constructor() {
    super({
      code: 'OTP_EXPIRED',
      message: 'OTP has expired. Please request a new one.',
    });
  }
}

export class OTPAttemptsExceededException extends BadRequestException {
  constructor() {
    super({
      code: 'OTP_ATTEMPTS_EXCEEDED',
      message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.',
    });
  }
}
