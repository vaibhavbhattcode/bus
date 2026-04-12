import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { BookingStatus, PaymentStatus, PromoCode, PromoCodeType, PromoCodeStatus, NotificationType } from 'prisma-client-custom';
import { Prisma } from 'prisma-client-custom';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { SystemSettingsService } from '../common/services/system-settings.service';
import { buildDepartureDate } from '../common/utils/time.util';
import { IdempotencyService } from '../common/services/idempotency.service';
import { ApmService } from '../common/services/apm.service';

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
    private idempotencyService: IdempotencyService,
    private apmService: ApmService,
  ) { }

  async create(userId: string, dto: CreateBookingDto) {
    return this.apmService.measure('booking.create', async () => {
      // Idempotency check
      const idempotencyKey = `booking:${userId}:${dto.routeId}:${dto.seatNumbers.join(',')}`;
      const existing = await this.idempotencyService.checkAndStore(idempotencyKey, null);
      if (!existing.isNew) {
        this.logger.log(`Duplicate booking request detected for user ${userId}`);
        return existing.data;
      }

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

      // Pre-validate promo code
      let promoCode: PromoCode | null = null;
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

      // FIXED: Atomic transaction with proper locking
      let result;
      try {
        result = await this.prisma.$transaction(async (prisma) => {
          // Verify Redis Locks
          if (dto.seatNumbers && dto.seatNumbers.length > 0) {
            for (const seatNumber of dto.seatNumbers) {
              const lockKey = `lock:route:${dto.routeId}:seat:${seatNumber}`;
              const lockedBy = await this.redisService.get<string>(lockKey);
              if (lockedBy && lockedBy !== userId) {
                throw new BadRequestException(`Seat ${seatNumber} is currently locked by another user.`);
              }
            }
          }

          // FIXED: Use updateMany with WHERE condition for atomic seat decrement
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

          // Seat conflict check
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

          // FIXED: Atomic promo code usage with optimistic locking
          if (dto.promoCodeId && promoCode) {
            const promoUpdate = await prisma.promoCode.updateMany({
              where: {
                id: dto.promoCodeId,
                status: PromoCodeStatus.ACTIVE,
                OR: [
                  { maxUses: null },
                  { maxUses: { gt: promoCode.usedCount } },
                ],
              },
              data: { usedCount: { increment: 1 } },
            });

            if (promoUpdate.count === 0) {
              throw new BadRequestException('Promo code usage limit has been reached');
            }
          }

          // Create booking
          const { passengerAge, passengerGender, status, paymentStatus, paymentMethod, promoCodeId, hasInsurance, ...rest } = dto;

          let finalStatus = (status as BookingStatus) ?? BookingStatus.PENDING;
          let finalPaymentStatus = (paymentStatus as PaymentStatus) ?? PaymentStatus.PENDING;

          if (paymentMethod === 'wallet') {
            // Single atomic wallet debit — fails if balance insufficient
            const walletUpdate = await prisma.wallet.updateMany({
              where: { userId, balance: { gte: finalTotalAmount } },
              data: {
                balance: { decrement: finalTotalAmount },
                totalDebit: { increment: finalTotalAmount },
              },
            });

            if (walletUpdate.count === 0) {
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

          // Record promo code usage
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

          // Create wallet transaction record
          if (paymentMethod === 'wallet') {
            const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
            if (wallet) {
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
          }

          return booking;
        }, {
          maxWait: 5000,
          timeout: 10000,
        });
      } finally {
        // Always release Redis locks whether transaction succeeded or failed
        if (dto.seatNumbers && dto.seatNumbers.length > 0) {
          for (const seatNumber of dto.seatNumbers) {
            const lockKey = `lock:route:${dto.routeId}:seat:${seatNumber}`;
            await this.redisService.releaseLock(lockKey, userId);
          }
        }
      }

      // Store result in idempotency cache after confirmed success
      await this.idempotencyService.checkAndStore(idempotencyKey, result);

      if (dto.paymentMethod === 'wallet') {
        await this.redisService.del(`wallet:${userId}`);
      }

      // Send notifications
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
    });
  }

  async findAll(filters?: AdminBookingFilters) {
    return this.apmService.measure('booking.findAll', async () => {
      const page = Number(filters?.page) || 1;
      const limit = Number(filters?.limit) || 20;
      const skip = (page - 1) * limit;

      const where: Prisma.BookingWhereInput = {};

      if (filters?.status && filters.status !== 'all') {
        const validStatuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        if (validStatuses.includes(filters.status as BookingStatus)) {
          where.status = filters.status as BookingStatus;
        }
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
    });
  }

  async findByUser(userId: string, filters?: UserBookingFilters) {
    return this.apmService.measure('booking.findByUser', async () => {
      const page = Number(filters?.page) || 1;
      const limit = Number(filters?.limit) || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.booking.findMany({
          where: { userId },
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
            refundAmount: true,
            cancelledAt: true,
            createdAt: true,
            updatedAt: true,
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
                    provider: {
                      select: {
                        id: true,
                        companyName: true,
                        rating: true,
                      },
                    },
                  },
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
    });
  }

  async findByProvider(providerId: string, filters?: ProviderBookingFilters) {
    return this.apmService.measure('booking.findByProvider', async () => {
      const page = Number(filters?.page) || 1;
      const limit = Number(filters?.limit) || 10;
      const skip = (page - 1) * limit;

      const routeFilter: Prisma.RouteWhereInput = {
        vehicle: { providerId },
      };

      if (filters?.date) {
        const date = new Date(filters.date);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        routeFilter.date = { gte: date, lt: nextDay };
      }

      const where: Prisma.BookingWhereInput = {
        route: routeFilter,
      };

      if (filters?.status && filters.status !== 'all') {
        const validStatuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        if (validStatuses.includes(filters.status as BookingStatus)) {
          where.status = filters.status as BookingStatus;
        }
      }

      if (filters?.routeId) {
        where.routeId = filters.routeId;
      }

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
          select: {
            id: true,
            seats: true,
            seatNumbers: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            passengerName: true,
            passengerPhone: true,
            pickupLocation: true,
            dropLocation: true,
            createdAt: true,
            user: {
              select: { name: true, email: true, phone: true },
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
                    totalSeats: true,
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
    });
  }

  async findOne(id: string) {
    return this.apmService.measure('booking.findOne', async () => {
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
    });
  }

  async markAsPaid(id: string, paymentId: string) {
    return this.apmService.measure('booking.markAsPaid', async () => {
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

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: BookingStatus.CONFIRMED,
          paymentId: paymentId
        },
      });

      await this.notificationsService.create(
        booking.userId,
        NotificationType.BOOKING_CONFIRMED,
        'Payment Successful',
        `Your payment for booking to ${booking.route.toCity} was successful!`,
        `/bookings/${id}`
      );

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
    });
  }

  async cancel(id: string, reason: string) {
    return this.apmService.measure('booking.cancel', async () => {
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

      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      const departureTime = buildDepartureDate(
        new Date(booking.route.date),
        booking.route.departureTime,
      );

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

      const updatedBooking = await this.prisma.$transaction(async (prisma) => {
        const cancelledBooking = await prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: reason,
            refundAmount,
            // Mark as REFUND_PENDING — will be updated to REFUNDED after gateway confirms
            paymentStatus: refundAmount > 0 ? PaymentStatus.REFUND_PENDING : booking.paymentStatus,
          },
        });

        await prisma.route.update({
          where: { id: booking.routeId },
          data: { availableSeats: { increment: booking.seats } },
        });

        return cancelledBooking;
      });

      if (refundAmount > 0 && booking.paymentId) {
        try {
          await this.paymentsService.processRefund(booking.paymentId, refundAmount);
          // Only mark as REFUNDED after gateway confirms success
          await this.prisma.booking.update({
            where: { id },
            data: { paymentStatus: PaymentStatus.REFUNDED },
          });
        } catch (refundError) {
          this.logger.error(
            `Refund failed for booking ${id} (paymentId: ${booking.paymentId}). ` +
              `Amount ₹${refundAmount} requires manual refund.`,
            refundError instanceof Error ? refundError.stack : String(refundError),
          );
        }
      }

      await this.notificationsService.create(
        booking.userId,
        NotificationType.BOOKING_CANCELLED,
        'Booking Cancelled',
        `Your booking to ${booking.route.toCity} has been cancelled. Refund: ₹${refundAmount}`,
        `/bookings/${id}`
      );

      if (booking.user?.email) {
        await this.mailService.queueBookingCancellation(
          booking.user.email,
          { id: booking.id, userName: booking.user.name },
          refundAmount,
        );
      }

      return updatedBooking;
    });
  }

  async updateStatus(id: string, status: string, paymentStatus?: string, requestingUser?: { id: string; role: string }) {
    return this.apmService.measure('booking.updateStatus', async () => {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        select: { id: true, routeId: true, seats: true, status: true, userId: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Only the booking owner or an ADMIN may change status
      if (
        requestingUser &&
        requestingUser.role !== 'ADMIN' &&
        booking.userId !== requestingUser.id
      ) {
        throw new BadRequestException('You are not authorized to update this booking');
      }

      const newStatus = status as BookingStatus;
      const currentStatus = booking.status as BookingStatus;

      if (newStatus === BookingStatus.CANCELLED && currentStatus !== BookingStatus.CANCELLED) {
        await this.prisma.route.update({
          where: { id: booking.routeId },
          data: { availableSeats: { increment: booking.seats } },
        });
      }

      if (newStatus === BookingStatus.CONFIRMED && currentStatus === BookingStatus.CANCELLED) {
        const route = await this.prisma.route.findUnique({ where: { id: booking.routeId } });
        if (route && route.availableSeats < booking.seats) {
          throw new BadRequestException('Not enough seats to re-confirm booking');
        }
        await this.prisma.route.update({
          where: { id: booking.routeId },
          data: { availableSeats: { decrement: booking.seats } },
        });
      }

      return this.prisma.booking.update({
        where: { id },
        data: {
          ...(status && { status: newStatus }),
          ...(paymentStatus && { paymentStatus: paymentStatus as PaymentStatus }),
        },
      });
    });
  }
}
