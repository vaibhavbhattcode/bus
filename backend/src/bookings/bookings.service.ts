import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { PromoCodeType, PromoCodeStatus, NotificationType, BookingStatus, PaymentStatus } from 'prisma-client-custom';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { SystemSettingsService } from '../common/services/system-settings.service';

/** Typed filter interfaces — eliminates `any` usage */
interface AdminBookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

interface UserBookingFilters {
  page?: number;
  limit?: number;
}

interface ProviderBookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  routeId?: string;
  date?: string;
  search?: string;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private promoCodesService: PromoCodesService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => PaymentsService)) private paymentsService: PaymentsService,
    private mailService: MailService,
    private redisService: RedisService,
    private systemSettings: SystemSettingsService,
  ) { }

  async create(userId: string, dto: CreateBookingDto) {
    this.logger.log(`Initiating booking for user ${userId} on route ${dto.routeId}`);
    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
      include: { vehicle: true },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    if (route.availableSeats < dto.seats) {
      throw new BadRequestException('Not enough seats available');
    }

    // ── Pre-validate promo code (fast fail before taking the lock) ──────────
    let promoCode: any = null;
    let discountAmount = 0;
    const totalAmountBase = route.price * dto.seats;

    if (dto.promoCodeId) {
      promoCode = await this.promoCodesService.findOne(dto.promoCodeId);
      const now = new Date();

      if (promoCode.status !== PromoCodeStatus.ACTIVE) {
        throw new BadRequestException('Promo code is inactive');
      }
      if (now < promoCode.validFrom || now > promoCode.validUntil) {
        throw new BadRequestException('Promo code is expired or not yet valid');
      }
      if (promoCode.minAmount && totalAmountBase < promoCode.minAmount) {
        throw new BadRequestException(`Minimum booking amount of ₹${promoCode.minAmount} required`);
      }
      if (
        promoCode.applicableRoutes &&
        promoCode.applicableRoutes.length > 0 &&
        !promoCode.applicableRoutes.includes(dto.routeId)
      ) {
        throw new BadRequestException('Promo code not applicable for this route');
      }

      // Calculate discount (will be confirmed / persisted inside the transaction)
      if (promoCode.type === PromoCodeType.PERCENTAGE) {
        discountAmount = (totalAmountBase * promoCode.value) / 100;
        if (promoCode.maxDiscount && discountAmount > promoCode.maxDiscount) {
          discountAmount = promoCode.maxDiscount;
        }
      } else {
        discountAmount = promoCode.value;
      }
      discountAmount = Math.min(discountAmount, totalAmountBase);
    }

    let insuranceAmount = 0;
    if (dto.hasInsurance) {
      const ratePerSeat = await this.systemSettings.getInsuranceRatePerSeat();
      insuranceAmount = ratePerSeat * dto.seats;
    }

    const finalTotalAmount = totalAmountBase - discountAmount + insuranceAmount;

    // ── Atomic transaction ───────────────────────────────────────────────────
    const result = await this.prisma.$transaction(async (prisma) => {
      // 0. Verify Redis Locks (seat-level)
      if (dto.seatNumbers && dto.seatNumbers.length > 0) {
        for (const seatNumber of dto.seatNumbers) {
          const lockKey = `lock:route:${dto.routeId}:seat:${seatNumber}`;
          const lockedBy = await this.redisService.get<string>(lockKey);
          if (lockedBy && lockedBy !== userId) {
            throw new BadRequestException(`Seat ${seatNumber} is currently locked by another user.`);
          }
        }
      }

      // 1. Atomic seat decrement — acquires row-level lock on Route
      const updateResult = await prisma.route.updateMany({
        where: {
          id: dto.routeId,
          availableSeats: { gte: dto.seats },
        },
        data: { availableSeats: { decrement: dto.seats } },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('Not enough seats available or route not found');
      }

      // 2. Seat conflict check (safe inside transaction)
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          routeId: dto.routeId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          seatNumbers: { hasSome: dto.seatNumbers },
        },
        select: { seatNumbers: true },
      });

      if (conflictingBookings.length > 0) {
        const allBookedSeats = conflictingBookings.flatMap((b) => b.seatNumbers);
        const myConflicts = dto.seatNumbers.filter((seat) => allBookedSeats.includes(seat));
        const uniqueConflicts = [...new Set(myConflicts)].sort((a, b) => Number(a) - Number(b));
        const seatMsg =
          uniqueConflicts.length > 0
            ? `Seat${uniqueConflicts.length > 1 ? 's' : ''} ${uniqueConflicts.join(', ')} ${uniqueConflicts.length > 1 ? 'are' : 'is'}`
            : 'One or more selected seats are';
        throw new BadRequestException(`${seatMsg} already booked. Please select different seats.`);
      }

      // 3. Atomic promo code max-uses check + increment (fixes race condition)
      if (dto.promoCodeId && promoCode) {
        const promoUpdate = await prisma.promoCode.updateMany({
          where: {
            id: dto.promoCodeId,
            status: PromoCodeStatus.ACTIVE,
            // Only succeed if maxUses is not yet reached; if maxUses is null (unlimited) — always succeeds
            OR: [
              { maxUses: null },
              { maxUses: { gt: promoCode.usedCount } },
            ],
          },
          data: { usedCount: { increment: 1 } },
        });

        if (promoUpdate.count === 0) {
          // Another concurrent request already filled the last slot
          throw new BadRequestException('Promo code usage limit has been reached');
        }
      }

      // 4. Create booking record
      const { passengerAge, passengerGender, status, paymentStatus, paymentMethod, promoCodeId, hasInsurance, ...rest } = dto;

      let finalStatus = (status as BookingStatus) ?? BookingStatus.PENDING;
      let finalPaymentStatus = (paymentStatus as PaymentStatus) ?? PaymentStatus.PENDING;

      if (paymentMethod === 'wallet') {
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet || wallet.balance < finalTotalAmount) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        finalStatus = BookingStatus.CONFIRMED;
        finalPaymentStatus = PaymentStatus.PAID;
      }

      const booking = await prisma.booking.create({
        data: {
          userId,
          ...rest,
          passengerAge: passengerAge ? Number(passengerAge) : undefined,
          passengerGender,
          hasInsurance: !!hasInsurance,
          insuranceAmount,
          paymentMethod,
          totalAmount: finalTotalAmount,
          status: finalStatus,
          paymentStatus: finalPaymentStatus,
        },
      });

      // 5. Record promo code usage
      if (dto.promoCodeId && discountAmount > 0) {
        await prisma.promoCodeUsage.create({
          data: {
            promoCodeId: dto.promoCodeId,
            userId,
            discountAmount,
            bookingId: booking.id,
          },
        });
      }

      // 6. Handle Wallet Debit
      if (paymentMethod === 'wallet') {
        const wallet = await prisma.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: finalTotalAmount },
            totalDebit: { increment: finalTotalAmount },
          },
        });
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: finalTotalAmount,
            status: 'COMPLETED',
            description: `Payment for booking to ${route.toCity}`,
            bookingId: booking.id,
          },
        });
      }

      return booking;
    });

    if (dto.paymentMethod === 'wallet') {
      await this.redisService.del(`wallet:${userId}`);
    }


    // Release Redis Locks
    if (dto.seatNumbers && dto.seatNumbers.length > 0) {
      for (const seatNumber of dto.seatNumbers) {
        const lockKey = `lock:route:${dto.routeId}:seat:${seatNumber}`;
        await this.redisService.releaseLock(lockKey, userId);
      }
    }

    // Send notifications (outside transaction)
    await this.notificationsService.create(
      userId,
      NotificationType.BOOKING_CONFIRMED,
      'Booking Confirmed',
      `Your booking to ${route.toCity} is confirmed!`,
      `/my-bookings`
    );

    if (route.vehicle && route.vehicle.providerId) {
      const provider = await this.prisma.provider.findUnique({ where: { id: route.vehicle.providerId } });
      if (provider) {
        await this.notificationsService.create(
          provider.userId,
          NotificationType.BOOKING_CONFIRMED,
          'New Booking',
          `New booking received for route ${route.fromCity} to ${route.toCity}.`,
          `/provider/bookings`
        );
      }
    }

    return result;
  }

  async findAll(filters?: AdminBookingFilters) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { passengerName: { contains: filters.search, mode: 'insensitive' } },
        { passengerPhone: { contains: filters.search, mode: 'insensitive' } },
        { passengerEmail: { contains: filters.search, mode: 'insensitive' } },
        { route: { fromCity: { contains: filters.search, mode: 'insensitive' } } },
        { route: { toCity: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          seats: true,
          seatNumbers: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          hasInsurance: true,
          passengerName: true,
          passengerPhone: true,
          passengerEmail: true,
          passengerAge: true,
          passengerGender: true,
          pickupLocation: true,
          dropLocation: true,
          cancelledAt: true,
          cancellationReason: true,
          refundAmount: true,
          createdAt: true,
          updatedAt: true,
          // Safe user fields only — never expose password hash
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          route: {
            select: {
              id: true,
              fromCity: true,
              toCity: true,
              date: true,
              departureTime: true,
              arrivalTime: true,
              price: true,
              vehicle: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  registrationNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUser(userId: string, filters?: UserBookingFilters) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          route: {
            include: {
              vehicle: {
                include: { provider: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByProvider(providerId: string, filters?: ProviderBookingFilters) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      route: {
        vehicle: {
          providerId,
        },
      },
    };

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters?.routeId) {
      where.routeId = filters.routeId;
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      where.route = {
        ...where.route,
        date: {
          gte: date,
          lt: nextDay,
        },
      };
    }

    // Handle search
    if (filters?.search) {
      where.OR = [
        { passengerName: { contains: filters.search, mode: 'insensitive' } },
        { passengerPhone: { contains: filters.search, mode: 'insensitive' } },
        { route: { fromCity: { contains: filters.search, mode: 'insensitive' } } },
        { route: { toCity: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          route: {
            include: {
              vehicle: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        seats: true,
        seatNumbers: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        paymentId: true,
        paymentMethod: true,
        hasInsurance: true,
        insuranceAmount: true,
        passengerName: true,
        passengerPhone: true,
        passengerEmail: true,
        passengerAge: true,
        passengerGender: true,
        pickupLocation: true,
        dropLocation: true,
        cancelledAt: true,
        cancellationReason: true,
        refundAmount: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        route: {
          select: {
            id: true,
            fromCity: true,
            toCity: true,
            date: true,
            departureTime: true,
            arrivalTime: true,
            arrivalDate: true,
            price: true,
            availableSeats: true,
            intermediateStops: true,
            vehicle: {
              select: {
                id: true,
                name: true,
                type: true,
                registrationNumber: true,
                totalSeats: true,
                seatLayout: true,
                amenities: true,
                provider: {
                  select: {
                    id: true,
                    companyName: true,
                    contactName: true,
                    contactPhone: true,
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async markAsPaid(id: string, paymentId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        routeId: true,
        seats: true,
        totalAmount: true,
        paymentStatus: true,
        status: true,
        route: { select: { fromCity: true, toCity: true, date: true, departureTime: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Update booking
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: BookingStatus.CONFIRMED,
        paymentId: paymentId // Storing Razorpay Payment ID
      },
    });

    // Send Notification
    await this.notificationsService.create(
      booking.userId,
      NotificationType.BOOKING_CONFIRMED,
      'Payment Successful',
      `Your payment for booking to ${booking.route.toCity} was successful!`,
      `/bookings/${id}`
    );

    // Send Email via Queue
    if (booking.user && booking.user.email) {
      await this.mailService.queueBookingConfirmation(booking.user.email, {
        id: booking.id,
        userName: booking.user.name,
        from: booking.route.fromCity,
        to: booking.route.toCity,
        date: booking.route.date.toLocaleDateString(),
        time: booking.route.departureTime,
        seats: booking.seats,
        amount: booking.totalAmount
      });
    }

    return updatedBooking;
  }

  async cancel(id: string, reason: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        routeId: true,
        seats: true,
        totalAmount: true,
        paymentStatus: true,
        paymentId: true,
        status: true,
        route: { select: { fromCity: true, toCity: true, date: true, departureTime: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Calculate refund amount
    const routeDate = new Date(booking.route.date);
    // Parse departure time — supports both "HH:MM" (24h) and "H:MM AM/PM" (12h) formats
    const rawTime = booking.route.departureTime.trim();
    let depHours = 0;
    let depMinutes = 0;
    const ampmMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      depHours = parseInt(ampmMatch[1], 10);
      depMinutes = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[3].toUpperCase();
      if (period === 'PM' && depHours !== 12) depHours += 12;
      if (period === 'AM' && depHours === 12) depHours = 0;
    } else {
      const parts = rawTime.split(':').map(Number);
      depHours = parts[0] || 0;
      depMinutes = parts[1] || 0;
    }
    const departureTime = new Date(routeDate);
    departureTime.setHours(depHours, depMinutes, 0, 0);

    const now = new Date();
    const diffInHours = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 0) {
      throw new BadRequestException('Cannot cancel past bookings');
    }

    let refundPercentage = 0;
    if (diffInHours >= 24) {
      refundPercentage = 100;
    } else if (diffInHours >= 12) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    let refundAmount = 0;
    if (refundPercentage > 0 && booking.paymentStatus === PaymentStatus.PAID) {
      refundAmount = (booking.totalAmount * refundPercentage) / 100;
    }

    // Process Refund if applicable
    if (refundAmount > 0 && booking.paymentId) {
      try {
        await this.paymentsService.processRefund(booking.paymentId, refundAmount);
      } catch (error) {
        // If refund fails, we might still want to cancel but log the error or throw?
        // For now, let's throw to prevent cancellation if refund fails
        throw new BadRequestException('Refund processing failed. Cancellation aborted.');
      }
    }

    // Update booking status
    const updatedBooking = await this.prisma.$transaction(async (prisma) => {
      const cancelledBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          paymentStatus: refundAmount > 0 ? PaymentStatus.REFUNDED : booking.paymentStatus,
        },
      });

      // Release seats
      await prisma.route.update({
        where: { id: booking.routeId },
        data: {
          availableSeats: {
            increment: booking.seats,
          },
        },
      });

      return cancelledBooking;
    });

    // Send Notification
    await this.notificationsService.create(
      booking.userId,
      NotificationType.BOOKING_CANCELLED,
      'Booking Cancelled',
      `Your booking to ${booking.route.toCity} has been cancelled. Refund: ₹${refundAmount}`,
      `/bookings/${id}`
    );

    // Send Email via Queue
    if (booking.user && booking.user.email) {
      await this.mailService.queueBookingCancellation(booking.user.email, {
        id: booking.id,
        userName: booking.user.name,
      }, refundAmount);
    }

    return updatedBooking;
  }

  async updateStatus(id: string, status: string, paymentStatus?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { route: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // If cancelling, restore seats
    if (status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      await this.prisma.route.update({
        where: { id: booking.routeId },
        data: {
          availableSeats: {
            increment: booking.seats,
          },
        },
      });
    }

    // If re-confirming (from cancelled), deduct seats
    if (status === 'CONFIRMED' && booking.status === 'CANCELLED') {
      const route = await this.prisma.route.findUnique({ where: { id: booking.routeId } });
      if (route && route.availableSeats < booking.seats) {
        throw new BadRequestException('Not enough seats to re-confirm booking');
      }
      await this.prisma.route.update({
        where: { id: booking.routeId },
        data: {
          availableSeats: {
            decrement: booking.seats,
          },
        },
      });
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status: status as BookingStatus }),
        ...(paymentStatus && { paymentStatus: paymentStatus as PaymentStatus }),
      },
    });
  }
}
