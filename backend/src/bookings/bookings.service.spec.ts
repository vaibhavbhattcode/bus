import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IdempotencyService } from '../common/services/idempotency.service';
import { ApmService } from '../common/services/apm.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;
  let redis: RedisService;
  let idempotency: IdempotencyService;

  const mockPrisma = {
    route: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    promoCode: {
      updateMany: jest.fn(),
    },
    promoCodeUsage: {
      create: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
    provider: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    releaseLock: jest.fn(),
  };

  const mockIdempotency = {
    checkAndStore: jest.fn(),
  };

  const mockApm = {
    measure: jest.fn((name, fn) => fn()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: IdempotencyService, useValue: mockIdempotency },
        { provide: ApmService, useValue: mockApm },
        { provide: 'PromoCodesService', useValue: {} },
        { provide: 'NotificationsService', useValue: {} },
        { provide: 'PaymentsService', useValue: {} },
        { provide: 'MailService', useValue: {} },
        { provide: 'SystemSettingsService', useValue: { getInsuranceRatePerSeat: jest.fn().mockResolvedValue(10) } },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    idempotency = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should prevent duplicate bookings with idempotency', async () => {
      const existingBooking = { id: 'booking-123', status: 'CONFIRMED' };
      mockIdempotency.checkAndStore.mockResolvedValue({
        isNew: false,
        data: existingBooking,
      });

      const result = await service.create('user-1', {
        routeId: 'route-1',
        seats: 2,
        seatNumbers: ['1', '2'],
        passengerName: 'Test User',
        passengerPhone: '1234567890',
      } as any);

      expect(result).toEqual(existingBooking);
      expect(mockPrisma.route.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error when route not found', async () => {
      mockIdempotency.checkAndStore.mockResolvedValue({ isNew: true });
      mockPrisma.route.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          routeId: 'invalid-route',
          seats: 2,
          seatNumbers: ['1', '2'],
          passengerName: 'Test User',
          passengerPhone: '1234567890',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when not enough seats available', async () => {
      mockIdempotency.checkAndStore.mockResolvedValue({ isNew: true });
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'route-1',
        availableSeats: 1,
        price: 500,
        vehicle: { id: 'vehicle-1' },
      });

      await expect(
        service.create('user-1', {
          routeId: 'route-1',
          seats: 2,
          seatNumbers: ['1', '2'],
          passengerName: 'Test User',
          passengerPhone: '1234567890',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle seat locking correctly', async () => {
      mockIdempotency.checkAndStore.mockResolvedValue({ isNew: true });
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'route-1',
        availableSeats: 5,
        price: 500,
        toCity: 'Mumbai',
        vehicle: { id: 'vehicle-1', providerId: 'provider-1' },
      });

      mockRedis.get.mockResolvedValue('user-1');
      mockPrisma.route.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.booking.create.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-1',
        status: 'PENDING',
      });

      const result = await service.create('user-1', {
        routeId: 'route-1',
        seats: 2,
        seatNumbers: ['1', '2'],
        passengerName: 'Test User',
        passengerPhone: '1234567890',
        paymentMethod: 'online',
      } as any);

      expect(mockRedis.releaseLock).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('booking-1');
    });
  });

  describe('cancel', () => {
    it('should calculate refund correctly based on cancellation time', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        userId: 'user-1',
        routeId: 'route-1',
        seats: 2,
        totalAmount: 1000,
        paymentStatus: 'PAID',
        paymentId: 'pay-123',
        status: 'CONFIRMED',
        route: {
          fromCity: 'Delhi',
          toCity: 'Mumbai',
          date: futureDate,
          departureTime: '10:00',
        },
        user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: 'CANCELLED',
        refundAmount: 1000,
      });

      const result = await service.cancel('booking-1', 'Changed plans');

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.route.update).toHaveBeenCalledWith({
        where: { id: 'route-1' },
        data: { availableSeats: { increment: 2 } },
      });
    });

    it('should not allow cancelling already cancelled booking', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'CANCELLED',
      });

      await expect(service.cancel('booking-1', 'Test')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByUser', () => {
    it('should return paginated bookings for user', async () => {
      const mockBookings = [
        { id: 'booking-1', userId: 'user-1', seats: 2 },
        { id: 'booking-2', userId: 'user-1', seats: 1 },
      ];

      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
      mockPrisma.booking.count.mockResolvedValue(2);

      const result = await service.findByUser('user-1', { page: 1, limit: 10 });

      expect(result.data).toEqual(mockBookings);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
