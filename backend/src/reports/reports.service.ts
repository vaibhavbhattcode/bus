import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { startOfWeek, startOfMonth, startOfYear } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getProviderEarnings(userId: string, period: 'week' | 'month' | 'year') {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
    }

    const routes = await this.prisma.route.findMany({
      where: {
        vehicle: { providerId: provider.id },
        date: { gte: startDate, lte: now },
      },
      include: {
        bookings: true,
      },
    });

    let totalRevenue = 0;
    let totalBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;

    const routePerformance = routes.map((route) => {
      let routeRevenue = 0;
      let routeBookings = route.bookings.length;
      let routeCompleted = 0;
      let routeCancelled = 0;

      route.bookings.forEach((booking) => {
        if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CONFIRMED) {
          routeRevenue += booking.totalAmount;
          routeCompleted++;
          totalRevenue += booking.totalAmount;
          completedBookings++;
        } else if (booking.status === BookingStatus.CANCELLED) {
          routeCancelled++;
          cancelledBookings++;
        }
      });

      totalBookings += routeBookings;

      const occupancyRate = route.totalSeats > 0 ? (routeCompleted / route.totalSeats) * 100 : 0;
      const cancellationRate = routeBookings > 0 ? (routeCancelled / routeBookings) * 100 : 0;
      const netEarnings = routeRevenue * 0.9;

      return {
        routeId: route.id,
        from: route.fromCity,
        to: route.toCity,
        totalBookings: routeBookings,
        revenue: routeRevenue,
        netEarnings,
        occupancyRate,
        cancellationRate,
      };
    });

    const commission = totalRevenue * 0.1;
    const netEarnings = totalRevenue - commission;

    return {
      totalRevenue,
      commission,
      netEarnings,
      totalBookings,
      completedBookings,
      cancelledBookings,
      routes: routePerformance,
    };
  }
}
