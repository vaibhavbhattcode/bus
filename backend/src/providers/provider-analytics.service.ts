import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProviderAnalyticsService {
    private readonly logger = new Logger(ProviderAnalyticsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Complete analytics dashboard for a provider.
     * All queries run in parallel for maximum performance.
     */
    async getDashboard(providerId: string) {
        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        startOfThisWeek.setHours(0, 0, 0, 0);

        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Run all analytics queries in parallel
        const [
            weeklyRevenue,
            monthlyRevenue,
            lastMonthRevenue,
            totalBookings,
            cancelledBookings,
            topRoutes,
            seatUtilization,
            recentBookings,
            hourlyDistribution,
        ] = await Promise.all([
            this.getRevenue(providerId, startOfThisWeek, now),
            this.getRevenue(providerId, startOfThisMonth, now),
            this.getRevenue(providerId, startOfLastMonth, endOfLastMonth),
            this.countBookings(providerId, undefined, ['CONFIRMED', 'COMPLETED', 'PENDING']),
            this.countBookings(providerId, undefined, ['CANCELLED']),
            this.getTopRoutes(providerId),
            this.getSeatUtilization(providerId),
            this.getRecentBookings(providerId),
            this.getHourlyDistribution(providerId),
        ]);

        const cancellationRate =
            totalBookings > 0
                ? ((cancelledBookings / (totalBookings + cancelledBookings)) * 100).toFixed(1)
                : '0.0';

        const revenueGrowth =
            lastMonthRevenue > 0
                ? (((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
                : null;

        return {
            revenue: {
                thisWeek: weeklyRevenue,
                thisMonth: monthlyRevenue,
                lastMonth: lastMonthRevenue,
                growthPercent: revenueGrowth,
            },
            bookings: {
                total: totalBookings,
                cancelled: cancelledBookings,
                cancellationRatePercent: cancellationRate,
            },
            topRoutes,
            seatUtilization,
            recentBookings,
            peakHours: hourlyDistribution,
            generatedAt: now,
        };
    }

    // ─────────────────────────────────────────────────────────────
    //  Private query helpers
    // ─────────────────────────────────────────────────────────────

    private async getRevenue(providerId: string, from: Date, to: Date): Promise<number> {
        const bookings = await (this.prisma as any).booking.findMany({
            where: {
                route: { vehicle: { providerId } },
                paymentStatus: 'PAID',
                createdAt: { gte: from, lte: to },
            },
            select: { totalAmount: true },
        });
        return bookings.reduce((sum: number, b: any) => sum + b.totalAmount, 0);
    }

    private async countBookings(
        providerId: string,
        from?: Date,
        statuses?: string[],
    ): Promise<number> {
        const where: any = { route: { vehicle: { providerId } } };
        if (from) where.createdAt = { gte: from };
        if (statuses) where.status = { in: statuses };
        return (this.prisma as any).booking.count({ where });
    }

    private async getTopRoutes(providerId: string): Promise<any[]> {
        const bookings = await (this.prisma as any).booking.groupBy({
            by: ['routeId'],
            where: {
                route: { vehicle: { providerId } },
                status: { in: ['CONFIRMED', 'COMPLETED'] },
            },
            _count: { routeId: true },
            _sum: { totalAmount: true },
            orderBy: { _count: { routeId: 'desc' } },
            take: 5,
        });

        // Enrich with route details
        const enriched = await Promise.all(
            bookings.map(async (item: any) => {
                const route = await (this.prisma as any).route.findUnique({
                    where: { id: item.routeId },
                    select: { fromCity: true, toCity: true, price: true },
                });
                return {
                    routeId: item.routeId,
                    from: route?.fromCity,
                    to: route?.toCity,
                    bookingCount: item._count.routeId,
                    totalRevenue: item._sum.totalAmount ?? 0,
                };
            }),
        );

        return enriched;
    }

    private async getSeatUtilization(providerId: string): Promise<any[]> {
        const routes = await (this.prisma as any).route.findMany({
            where: { vehicle: { providerId }, deletedAt: null },
            select: { id: true, fromCity: true, toCity: true, totalSeats: true, availableSeats: true, date: true },
            orderBy: { date: 'desc' },
            take: 10,
        });

        return routes.map((r: any) => ({
            routeId: r.id,
            from: r.fromCity,
            to: r.toCity,
            date: r.date,
            totalSeats: r.totalSeats,
            bookedSeats: r.totalSeats - r.availableSeats,
            utilizationPercent: r.totalSeats > 0
                ? (((r.totalSeats - r.availableSeats) / r.totalSeats) * 100).toFixed(1)
                : '0.0',
        }));
    }

    private async getRecentBookings(providerId: string): Promise<any[]> {
        return (this.prisma as any).booking.findMany({
            where: { route: { vehicle: { providerId } } },
            include: {
                user: { select: { name: true, phone: true } },
                route: { select: { fromCity: true, toCity: true, date: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
    }

    private async getHourlyDistribution(providerId: string): Promise<any[]> {
        const bookings = await (this.prisma as any).booking.findMany({
            where: { route: { vehicle: { providerId } } },
            select: { createdAt: true },
        });

        const hourCounts = new Array(24).fill(0);
        bookings.forEach((b: any) => {
            const hour = new Date(b.createdAt).getHours();
            hourCounts[hour]++;
        });

        return hourCounts.map((count, hour) => ({ hour, bookingCount: count }));
    }
}
