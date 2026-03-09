import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderStatus, NotificationType, NotificationStatus, UserRole, BookingStatus, PaymentStatus } from 'prisma-client-custom';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { SendNotificationDto, RecipientType } from './dto/send-notification.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private redisService: RedisService,
  ) { }

  async sendCustomNotification(dto: SendNotificationDto) {
    const { recipientType, userId, title, message, type, city } = dto;
    const notificationType = type || NotificationType.SYSTEM;

    if (recipientType === RecipientType.SPECIFIC_USER && userId) {
      return this.notificationsService.create(userId, notificationType, title, message);
    }

    let users = [];
    const where: any = { isActive: true };

    if (recipientType === RecipientType.ALL_PROVIDERS) {
      where.role = UserRole.PROVIDER;
    } else if (recipientType === RecipientType.ALL_PASSENGERS) {
      where.role = UserRole.PASSENGER;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (
      recipientType === RecipientType.ALL_USERS ||
      recipientType === RecipientType.ALL_PROVIDERS ||
      recipientType === RecipientType.ALL_PASSENGERS
    ) {
      users = await this.prisma.user.findMany({
        where,
        select: { id: true },
      });
    }

    if (users.length > 0) {
      const notifications = users.map(u => ({
        userId: u.id,
        type: notificationType,
        title,
        message,
        status: NotificationStatus.UNREAD
      }));

      const result = await this.prisma.notification.createMany({
        data: notifications
      });

      this.logger.log(`Notification sent to ${users.length} users: "${title}"`);

      // Send real-time notifications
      const now = new Date();
      users.forEach(u => {
        this.notificationsGateway.sendNotificationToUser(u.id, {
          userId: u.id,
          type: notificationType,
          title,
          message,
          status: NotificationStatus.UNREAD,
          createdAt: now,
          readAt: null,
          link: null,
          metadata: null
        });
      });

      return result;
    }

    this.logger.warn(`No recipients found for notification: type=${recipientType}`);
    return { count: 0 };
  }

  async getProviderAnalytics(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        route: {
          vehicle: {
            providerId,
          },
        },
      },
      select: {
        totalAmount: true,
        status: true,
        createdAt: true,
        route: {
          select: {
            id: true,
            fromCity: true,
            toCity: true,
            vehicle: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    let totalRevenue = 0;
    const routeStats = new Map<
      string,
      { routeId: string; name: string; vehicle: string; bookings: number; revenue: number }
    >();
    const vehicleIds = new Set<string>();
    const routeIds = new Set<string>();
    const revenueByMonth = new Map<string, number>();

    bookings.forEach((b) => {
      const amount =
        b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED
          ? b.totalAmount
          : 0;
      if (amount > 0) {
        totalRevenue += amount;
      }
      const route = b.route;
      if (route?.id) {
        routeIds.add(route.id);
        const vehicleName = route.vehicle?.name || 'Bus';
        const key = route.id;
        const prev =
          routeStats.get(key) || {
            routeId: route.id,
            name: `${route.fromCity}→${route.toCity}`,
            vehicle: vehicleName,
            bookings: 0,
            revenue: 0,
          };
        prev.bookings += 1;
        prev.revenue += amount;
        routeStats.set(key, prev);
      }
      const vehicleId = route?.vehicle?.id;
      if (vehicleId) {
        vehicleIds.add(vehicleId);
      }
      const d = new Date(b.createdAt);
      if (!isNaN(d.getTime())) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const prevAmount = revenueByMonth.get(monthKey) || 0;
        revenueByMonth.set(monthKey, prevAmount + amount);
      }
    });

    const monthlyRevenue = Array.from(revenueByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));

    const topRoutes = Array.from(routeStats.values())
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);

    return {
      stats: {
        totalRevenue,
        totalBookings: bookings.length,
        totalVehicles: vehicleIds.size,
        totalRoutes: routeIds.size,
      },
      monthlyRevenue,
      topRoutes,
      provider: {
        contactEmail: provider.contactEmail || provider.user?.email || null,
        contactPhone: provider.contactPhone || provider.user?.phone || null,
        address: provider.address || null,
        city: provider.city || null,
        createdAt: provider.createdAt,
      },
    };
  }

  async getUserAnalytics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        route: {
          include: {
            vehicle: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSpend = 0;
    let completed = 0;
    let cancelled = 0;
    let upcoming = 0;
    const now = new Date();

    const monthlyMap = new Map<string, { month: string; bookings: number; revenue: number }>();
    const routeMap = new Map<string, { routeId: string | null; name: string; bookings: number; revenue: number }>();

    bookings.forEach((b) => {
      const isRevenue =
        b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED;
      if (isRevenue) {
        totalSpend += b.totalAmount;
      }

      if (b.status === BookingStatus.COMPLETED) {
        completed += 1;
      } else if (b.status === BookingStatus.CANCELLED) {
        cancelled += 1;
      } else if (b.status === BookingStatus.CONFIRMED && b.route?.date && b.route.date > now) {
        upcoming += 1;
      }

      const created = new Date(b.createdAt);
      if (!isNaN(created.getTime())) {
        const monthKey = `${created.getFullYear()}-${String(
          created.getMonth() + 1,
        ).padStart(2, '0')}`;
        const prev =
          monthlyMap.get(monthKey) || {
            month: monthKey,
            bookings: 0,
            revenue: 0,
          };
        prev.bookings += 1;
        if (isRevenue) {
          prev.revenue += b.totalAmount;
        }
        monthlyMap.set(monthKey, prev);
      }

      const fromCity = b.route?.fromCity;
      const toCity = b.route?.toCity;
      if (fromCity && toCity) {
        const key = `${fromCity}→${toCity}`;
        const prev =
          routeMap.get(key) || {
            routeId: b.routeId,
            name: key,
            bookings: 0,
            revenue: 0,
          };
        prev.bookings += 1;
        if (isRevenue) {
          prev.revenue += b.totalAmount;
        }
        routeMap.set(key, prev);
      }
    });

    const monthlyBookings = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    const topRoutes = Array.from(routeMap.values())
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    const recentBookings = bookings.slice(0, 10).map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      status: b.status,
      totalAmount: b.totalAmount,
      fromCity: b.route?.fromCity,
      toCity: b.route?.toCity,
      journeyDate: b.route?.date,
      departureTime: b.route?.departureTime,
    }));

    return {
      stats: {
        totalBookings: bookings.length,
        totalSpend,
        completed,
        cancelled,
        upcoming,
        firstBookingAt: bookings.length ? bookings[bookings.length - 1].createdAt : null,
        lastBookingAt: bookings.length ? bookings[0].createdAt : null,
        avgBookingValue: bookings.length ? totalSpend / bookings.length : 0,
      },
      monthlyBookings,
      topRoutes,
      recentBookings,
    };
  }

  async getAnalyticsSummary(params?: {
    start?: string;
    end?: string;
    fromCity?: string;
    toCity?: string;
    providerId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const {
      start,
      end,
      fromCity,
      toCity,
      providerId,
      groupBy = 'day'
    } = params || {};

    const startDate = start ? new Date(start) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end ? new Date(end) : new Date();

    const whereBooking: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (fromCity || toCity || providerId) {
      whereBooking.route = {};
      if (fromCity) whereBooking.route.fromCity = { contains: fromCity, mode: 'insensitive' };
      if (toCity) whereBooking.route.toCity = { contains: toCity, mode: 'insensitive' };
      if (providerId) whereBooking.route.vehicle = { providerId };
    }

    const [bookings, users, feedbacks, providers, allTimeFeedbacks] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereBooking,
        include: {
          user: { select: { name: true } },
          route: {
            include: {
              vehicle: {
                include: {
                  provider: { select: { id: true, companyName: true } }
                }
              }
            }
          }
        }
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true, role: true, city: true }
      }),
      this.prisma.feedback.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          rating: { not: null }
        },
        select: {
          providerId: true,
          rating: true,
          createdAt: true,
          provider: { select: { companyName: true } }
        }
      }),
      this.prisma.provider.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { city: true }
      }),
      this.prisma.feedback.findMany({
        where: { providerId: { not: null }, rating: { not: null } },
        select: { providerId: true, rating: true, provider: { select: { companyName: true } } }
      }),
    ]);

    // Grouping logic helper
    const getGroupKey = (date: Date) => {
      const d = new Date(date);
      if (groupBy === 'day') {
        return d.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        return firstDay.toISOString().split('T')[0];
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    const routeCounts = new Map<string, { fromCity: string; toCity: string; count: number; revenue: number }>();
    const providerCounts = new Map<string, { providerId: string; companyName: string; count: number; revenue: number }>();
    const vehicleCounts = new Map<string, { vehicleId: string; name: string; count: number }>();
    const vehicleTypeCounts = new Map<string, { type: string; count: number }>();
    const userBookingCounts = new Map<string, { userId: string; name: string; count: number; spend: number }>();
    const trends = new Map<string, { date: string; bookings: number; revenue: number; users: number; cancelled: number; completed: number }>();
    const hourCounts = new Array(24).fill(0);

    let totalRevenue = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let totalAmountAllBookings = 0;
    const repeatUserIds = new Set<string>();
    const seenUserIds = new Map<string, number>();

    // Process Bookings
    bookings.forEach((b) => {
      totalAmountAllBookings += b.totalAmount;
      const isRevenue = b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED;
      if (isRevenue) totalRevenue += b.totalAmount;
      if (b.status === BookingStatus.CONFIRMED) confirmedCount++;
      else if (b.status === BookingStatus.CANCELLED) cancelledCount++;
      else if (b.status === BookingStatus.COMPLETED) completedCount++;
      else pendingCount++;

      const bHour = new Date(b.createdAt).getHours();
      hourCounts[bHour] += 1;

      if (b.userId) {
        const prev = seenUserIds.get(b.userId) || 0;
        seenUserIds.set(b.userId, prev + 1);
        if (prev >= 1) repeatUserIds.add(b.userId);
      }

      const fromCity = b.route?.fromCity || '';
      const toCity = b.route?.toCity || '';
      if (fromCity && toCity) {
        const key = `${fromCity}→${toCity}`;
        const prev = routeCounts.get(key) || { fromCity, toCity, count: 0, revenue: 0 };
        prev.count += 1;
        if (isRevenue) prev.revenue += b.totalAmount;
        routeCounts.set(key, prev);
      }
      const provider = b.route?.vehicle?.provider;
      if (provider?.id) {
        const pid = provider.id;
        const prev = providerCounts.get(pid) || { providerId: pid, companyName: provider.companyName, count: 0, revenue: 0 };
        prev.count += 1;
        if (isRevenue) prev.revenue += b.totalAmount;
        providerCounts.set(pid, prev);
      }
      const vehicle = b.route?.vehicle;
      if (vehicle?.id) {
        const vid = vehicle.id;
        const prev = vehicleCounts.get(vid) || { vehicleId: vid, name: vehicle.name || 'Bus', count: 0 };
        prev.count += 1;
        vehicleCounts.set(vid, prev);
        const vname = (vehicle.name || '').toLowerCase();
        const vType = vname.includes('volvo') || vname.includes('ac') ? 'AC Bus'
          : vname.includes('sleeper') ? 'Sleeper'
            : vname.includes('mini') ? 'Mini Bus'
              : vname.includes('tempo') ? 'Tempo Traveller'
                : vname.includes('suv') ? 'SUV'
                  : 'Standard Bus';
        const prevType = vehicleTypeCounts.get(vType) || { type: vType, count: 0 };
        prevType.count += 1;
        vehicleTypeCounts.set(vType, prevType);
      }
      if (b.userId) {
        const uid = b.userId;
        const prev = userBookingCounts.get(uid) || { userId: uid, name: b.user?.name || 'User', count: 0, spend: 0 };
        prev.count += 1;
        if (isRevenue) prev.spend += b.totalAmount;
        userBookingCounts.set(uid, prev);
      }

      const key = getGroupKey(b.createdAt);
      const current = trends.get(key) || { date: key, bookings: 0, revenue: 0, users: 0, cancelled: 0, completed: 0 };
      current.bookings += 1;
      if (isRevenue) current.revenue += b.totalAmount;
      if (b.status === BookingStatus.CANCELLED) current.cancelled += 1;
      if (b.status === BookingStatus.COMPLETED) current.completed += 1;
      trends.set(key, current);
    });

    // Process Users for Trend
    users.forEach((u) => {
      const key = getGroupKey(u.createdAt);
      const current = trends.get(key) || { date: key, bookings: 0, revenue: 0, users: 0, cancelled: 0, completed: 0 };
      current.users += 1;
      trends.set(key, current);
    });

    const providerRatings = new Map<string, { providerId: string; companyName: string; avgRating: number; ratingsCount: number }>();
    const ratingBuckets = [0, 0, 0, 0, 0];
    let positiveCount = 0;
    let negativeCount = 0;
    const userCityCounts = new Map<string, { city: string; count: number }>();
    const providerCityCounts = new Map<string, { city: string; count: number }>();

    users.forEach((u) => {
      const city = (u.city || '').trim();
      if (!city) return;
      const key = city.toLowerCase();
      const prev = userCityCounts.get(key) || { city, count: 0 };
      prev.count += 1;
      userCityCounts.set(key, prev);
    });
    allTimeFeedbacks.forEach((f) => {
      const pid = f.providerId!;
      const prev = providerRatings.get(pid) || { providerId: pid, companyName: f.provider?.companyName || 'Provider', avgRating: 0, ratingsCount: 0 };
      prev.avgRating = ((prev.avgRating * prev.ratingsCount) + (f.rating || 0)) / (prev.ratingsCount + 1);
      prev.ratingsCount += 1;
      providerRatings.set(pid, prev);
    });

    feedbacks.forEach((f) => {
      const r = Math.round(f.rating || 0);
      if (r >= 1 && r <= 5) ratingBuckets[r - 1] += 1;
      if (r >= 4) positiveCount++;
      if (r <= 2) negativeCount++;
    });

    providers.forEach((p) => {
      const city = (p.city || '').trim();
      if (!city) return;
      const key = city.toLowerCase();
      const prev = providerCityCounts.get(key) || { city, count: 0 };
      prev.count += 1;
      providerCityCounts.set(key, prev);
    });

    const sortTop = <T extends { count?: number; avgRating?: number }>(arr: T[], key: keyof T, limit = 10) =>
      arr.sort((a, b) => Number(b[key]) - Number(a[key])).slice(0, limit);

    const trendData = Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
    const totalBookings = bookings.length;
    const avgBookingValue = totalBookings > 0 ? totalAmountAllBookings / totalBookings : 0;
    const avgRatingAllTime = allTimeFeedbacks.length > 0
      ? allTimeFeedbacks.reduce((a, f) => a + (f.rating || 0), 0) / allTimeFeedbacks.length
      : 0;
    const conversionRate = totalBookings > 0 ? Math.round(((confirmedCount + completedCount) / totalBookings) * 100) : 0;
    const cancellationRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;
    const repeatUserRate = seenUserIds.size > 0 ? Math.round((repeatUserIds.size / seenUserIds.size) * 100) : 0;
    const uniqueUserCount = seenUserIds.size;
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const hourlyDistribution = hourCounts.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      bookings: count,
    }));

    return {
      topRoutes: sortTop(Array.from(routeCounts.values()), 'count', 10),
      topProvidersByBookings: sortTop(Array.from(providerCounts.values()), 'count', 10),
      topProvidersByRating: sortTop(Array.from(providerRatings.values()), 'avgRating', 10),
      topVehicles: sortTop(Array.from(vehicleCounts.values()), 'count', 10),
      topUsersByBookings: sortTop(Array.from(userBookingCounts.values()), 'count', 10),
      topUsersBySpend: sortTop(Array.from(userBookingCounts.values()).map(u => ({ ...u, count: u.spend })), 'count', 10)
        .map(u => ({ ...u, spend: u.count })),
      userCityDistribution: sortTop(Array.from(userCityCounts.values()), 'count', 10),
      providerCityDistribution: sortTop(Array.from(providerCityCounts.values()), 'count', 10),
      vehicleTypeDistribution: sortTop(Array.from(vehicleTypeCounts.values()), 'count', 8),
      trends: trendData,
      hourlyDistribution,
      summary: {
        totalRevenue,
        totalBookings,
        totalNewUsers: users.length,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100,
        confirmedCount,
        cancelledCount,
        completedCount,
        pendingCount,
        conversionRate,
        cancellationRate,
        uniqueUserCount,
        repeatUserRate,
        peakHour,
        revenuePerUser: uniqueUserCount > 0 ? Math.round(totalRevenue / uniqueUserCount) : 0,
      },
      feedbackSummary: {
        total: feedbacks.length,
        avgRating: Math.round(avgRatingAllTime * 10) / 10,
        positive: positiveCount,
        negative: negativeCount,
        neutral: feedbacks.length - positiveCount - negativeCount,
        satisfactionRate: feedbacks.length > 0 ? Math.round((positiveCount / feedbacks.length) * 100) : 0,
      },
      ratingDistribution: ratingBuckets.map((count, i) => ({ stars: i + 1, count })),
      bookingsByStatus: [
        { status: 'Confirmed', count: confirmedCount, color: '#10b981' },
        { status: 'Completed', count: completedCount, color: '#6366f1' },
        { status: 'Cancelled', count: cancelledCount, color: '#ef4444' },
        { status: 'Pending', count: pendingCount, color: '#f59e0b' },
      ].filter(s => s.count > 0),
      revenueByProvider: sortTop(
        Array.from(providerCounts.values()).map(p => ({ ...p, count: p.revenue })),
        'count', 8
      ).map(p => ({ companyName: p.companyName, revenue: p.count })),
    };
  }

  private buildUserSearchWhere(params: {
    search?: string;
    userId?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const { search, userId, email, phone, role, isActive, startDate, endDate } = params;
    const where: any = {};

    if (userId) {
      where.id = userId;
    }

    if (email) {
      where.email = { equals: email, mode: 'insensitive' };
    }

    if (phone) {
      where.phone = phone;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (role) {
      where.role = role;
    }

    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) {
        createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
      where.createdAt = createdAt;
    }

    if (search) {
      const trimmed = search.trim();
      const tokens = trimmed.split(/\s+/).filter(Boolean);

      const orConditions: any[] = [];

      const normalizeWildcard = (value: string) => value.replace(/\*/g, '');

      const pushLikeConditions = (value: string) => {
        const v = normalizeWildcard(value);
        if (!v) return;
        orConditions.push(
          { name: { contains: v, mode: 'insensitive' } },
          { email: { contains: v, mode: 'insensitive' } },
          { phone: { contains: v, mode: 'insensitive' } },
        );
      };

      if (tokens.length > 1) {
        tokens.forEach((t) => pushLikeConditions(t));
      } else {
        pushLikeConditions(trimmed);
      }

      if (!where.OR) {
        where.OR = [];
      }
      where.OR = where.OR.concat(orConditions);
    }

    return where;
  }

  private getUsersCacheKey(params: any) {
    const stable = JSON.stringify(
      params,
      Object.keys(params).sort(),
    );
    return `admin:users:search:${stable}`;
  }

  private async invalidateUsersCache() {
    const keys = await this.redisService.getKeys('admin:users:search:*');
    if (keys.length) {
      await Promise.all(keys.map((k) => this.redisService.del(k)));
    }
  }

  async findAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    userId?: string;
    email?: string;
    phone?: string;
    isActive?: string | boolean;
    startDate?: string;
    endDate?: string;
    cursor?: string;
    includeTotal?: string | boolean;
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      userId,
      email,
      phone,
      isActive,
      startDate,
      endDate,
      cursor,
      includeTotal = true,
    } = params;

    const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = cursor ? 1 : (Number(page) - 1) * parsedLimit;

    const where = this.buildUserSearchWhere({
      search,
      userId,
      email,
      phone,
      role,
      isActive: typeof isActive === 'string' ? isActive === 'true' : isActive,
      startDate,
      endDate,
    });

    const cacheKey = this.getUsersCacheKey({
      page,
      limit: parsedLimit,
      search,
      role,
      sortBy,
      sortOrder,
      userId,
      email,
      phone,
      isActive,
      startDate,
      endDate,
      cursor,
      includeTotal,
    });

    const cached = await this.redisService.get<{
      data: any[];
      meta: any;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const includeTotalBool =
      typeof includeTotal === 'string' ? includeTotal !== 'false' : !!includeTotal;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: parsedLimit,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      }),
      includeTotalBool ? this.prisma.user.count({ where }) : Promise.resolve(0),
    ]);

    const nextCursor = users.length === parsedLimit ? users[users.length - 1].id : null;

    const result = {
      data: users,
      meta: {
        total: includeTotalBool ? total : null,
        page: Number(page),
        limit: parsedLimit,
        totalPages: includeTotalBool ? Math.ceil(total / parsedLimit) : null,
        nextCursor,
      },
    };

    await this.redisService.set(cacheKey, result, 60);

    return result;
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN && !isActive) {
      throw new BadRequestException('Cannot deactivate admin users');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
    this.logger.log(`User ${userId} status updated: isActive=${isActive}`);
    await this.invalidateUsersCache();
    return updated;
  }

  async findAllProviders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    // ── Redis cache key ──────────────────────────────────────────────────────
    const cacheKey = `admin:providers:${JSON.stringify({ page: parsedPage, limit: parsedLimit, search: search || '', status: status || 'all', sortBy, sortOrder })}`;
    const cached = await this.redisService.get<{ data: any[]; meta: any }>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (search) {
      const s = search.trim();
      where.OR = [
        { companyName: { contains: s, mode: 'insensitive' } },
        { contactPhone: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }
    if (status && status !== 'all') {
      where.status = status as ProviderStatus;
    }

    const validSortFields = ['createdAt', 'companyName', 'status', 'city'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { [safeSortBy]: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
          _count: { select: { vehicles: true } },
          feedbacks: { select: { rating: true }, take: 100 },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    const providerIds = providers.map((p) => p.id);

    // ── Per-provider booking stats: lean projection, in-memory grouping ──────
    let bookingAgg: { providerId: string; _count: number; _sum: number }[] = [];
    if (providerIds.length > 0) {
      const bookingRecords = await this.prisma.booking.findMany({
        where: { route: { vehicle: { providerId: { in: providerIds } } } },
        select: {
          status: true,
          totalAmount: true,
          route: { select: { vehicle: { select: { providerId: true } } } },
        },
      });
      const aggMap = new Map<string, { _count: number; _sum: number }>();
      bookingRecords.forEach((b) => {
        const pid = b.route?.vehicle?.providerId;
        if (!pid) return;
        const prev = aggMap.get(pid) ?? { _count: 0, _sum: 0 };
        prev._count += 1;
        if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) {
          prev._sum += b.totalAmount;
        }
        aggMap.set(pid, prev);
      });
      bookingAgg = Array.from(aggMap.entries()).map(([providerId, s]) => ({ providerId, ...s }));
    }

    const statsMap = new Map<string, { totalBookings: number; totalRevenue: number }>();
    bookingAgg.forEach((r) => {
      statsMap.set(r.providerId, { totalBookings: r._count, totalRevenue: r._sum });
    });

    const enriched = providers.map((p) => {
      const stats = statsMap.get(p.id) || { totalBookings: 0, totalRevenue: 0 };
      const feedbackList = (p as any).feedbacks as Array<{ rating: number | null }> | undefined ?? [];
      const ratings = feedbackList.map((f) => f.rating).filter((r): r is number => r !== null);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      const { feedback: _fb, ...rest } = p as any;
      void _fb;
      return {
        ...rest,
        totalBookings: stats.totalBookings,
        totalRevenue: stats.totalRevenue,
        rating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
        contactName: (p as any).user?.name ?? null,
      };
    });

    const result = {
      data: enriched,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };

    await this.redisService.set(cacheKey, result, 60);
    return result;
  }

  private async invalidateProvidersCache() {
    const keys = await this.redisService.getKeys('admin:providers:*');
    if (keys.length) await Promise.all(keys.map((k) => this.redisService.del(k)));
  }

  async suspendProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updatedProvider = await this.prisma.provider.update({
      where: { id: providerId },
      data: { status: ProviderStatus.SUSPENDED },
    });

    this.logger.warn(`Provider ${providerId} suspended`);

    await this.notificationsService.create(
      updatedProvider.userId,
      NotificationType.SYSTEM,
      'Account Suspended',
      'Your provider account has been suspended by admin. Please contact support for details.',
      '/contact'
    );
    await this.invalidateProvidersCache();
    return updatedProvider;
  }

  async activateProvider(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updatedProvider = await this.prisma.provider.update({
      where: { id: providerId },
      data: { status: ProviderStatus.VERIFIED },
    });

    this.logger.log(`Provider ${providerId} activated`);

    await this.notificationsService.create(
      updatedProvider.userId,
      NotificationType.SYSTEM,
      'Account Activated',
      'Your provider account has been re-activated. You can continue managing your routes and bookings.',
      '/provider/dashboard'
    );
    await this.invalidateProvidersCache();
    return updatedProvider;
  }

  async findAllBookings(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 10, search, status, paymentStatus, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    // Redis cache
    const cacheKey = `admin:bookings:${JSON.stringify({ page: parsedPage, limit: parsedLimit, search: search || '', status: status || 'all', paymentStatus: paymentStatus || 'all', startDate: startDate || '', endDate: endDate || '', sortBy, sortOrder })}`;
    const cached = await this.redisService.get<{ data: any[]; meta: any }>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (search) {
      where.OR = [
        { passengerName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { route: { OR: [{ fromCity: { contains: search, mode: 'insensitive' } }, { toCity: { contains: search, mode: 'insensitive' } }] } }
      ];
    }
    if (status && status !== 'all') { where.status = status; }
    if (paymentStatus && paymentStatus !== 'all') { where.paymentStatus = paymentStatus as PaymentStatus; }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) { const s = new Date(startDate); if (!isNaN(s.getTime())) where.createdAt.gte = s; }
      if (endDate) { const e = new Date(endDate); if (!isNaN(e.getTime())) { e.setHours(23, 59, 59, 999); where.createdAt.lte = e; } }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where, skip, take: parsedLimit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { name: true, email: true } },
          route: { include: { vehicle: { include: { provider: { select: { companyName: true } } } } } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    const result = {
      data: bookings,
      meta: { total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) },
    };
    await this.redisService.set(cacheKey, result, 30);
    return result;
  }

  async getPendingProviders() {
    return this.prisma.provider.findMany({
      where: { status: ProviderStatus.PENDING },
      include: { user: true },
    });
  }

  async verifyProvider(providerId: string, adminId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updatedProvider = await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        status: ProviderStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: adminId,
      },
    });

    this.logger.log(`Provider ${providerId} verified by admin ${adminId}`);

    await this.notificationsService.create(
      updatedProvider.userId,
      NotificationType.SYSTEM,
      'Account Verified',
      'Your provider account has been verified! You can now start adding vehicles and routes.',
      '/provider/dashboard'
    );

    await this.invalidateProvidersCache();
    return updatedProvider;
  }

  async rejectProvider(providerId: string) {
    const updatedProvider = await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        status: ProviderStatus.REJECTED,
      },
    });

    this.logger.log(`Provider ${providerId} rejected`);

    await this.notificationsService.create(
      updatedProvider.userId,
      NotificationType.SYSTEM,
      'Account Rejected',
      'Your provider account application was rejected. Please contact support for more details.',
      '/contact'
    );

    await this.invalidateProvidersCache();
    return updatedProvider;
  }

  // ─── Enhanced Dashboard Stats with Growth ──────────────────────────────────
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    // Previous period (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));

    // Last 30 days vs prior 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      totalUsers,
      totalProviders,
      totalBookings,
      pendingProviders,
      openTickets,
      revenueResult,
      todayBookings,
      todayRevenueResult,
      yesterdayBookings,
      yesterdayRevenue,
      last30Bookings,
      prior30Bookings,
      last30Revenue,
      prior30Revenue,
      last30Users,
      prior30Users,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.provider.count(),
      this.prisma.booking.count(),
      this.prisma.provider.count({ where: { status: ProviderStatus.PENDING } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      }),
      this.prisma.booking.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.prisma.booking.count({
        where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.prisma.booking.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.booking.count({
        where: { createdAt: { gte: sixtyDaysAgo, lte: thirtyDaysAgo } },
      }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: sixtyDaysAgo, lte: thirtyDaysAgo },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: sixtyDaysAgo, lte: thirtyDaysAgo } },
      }),
      this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          route: { select: { fromCity: true, toCity: true } },
        },
      }),
    ]);

    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const todayRev = todayRevenueResult._sum.totalAmount || 0;
    const yesterdayRev = yesterdayRevenue._sum.totalAmount || 0;
    const last30Rev = last30Revenue._sum.totalAmount || 0;
    const prior30Rev = prior30Revenue._sum.totalAmount || 0;

    return {
      overview: {
        totalUsers,
        totalProviders,
        totalBookings,
        totalRevenue: revenueResult._sum.totalAmount || 0,
      },
      users: { total: totalUsers },
      providers: { total: totalProviders },
      bookings: { total: totalBookings },
      alerts: {
        pendingProviders,
        openTickets,
      },
      today: {
        bookings: todayBookings,
        revenue: todayRev,
        bookingsGrowth: calcGrowth(todayBookings, yesterdayBookings),
        revenueGrowth: calcGrowth(todayRev, yesterdayRev),
      },
      last30Days: {
        bookings: last30Bookings,
        revenue: last30Rev,
        newUsers: last30Users,
        bookingsGrowth: calcGrowth(last30Bookings, prior30Bookings),
        revenueGrowth: calcGrowth(last30Rev, prior30Rev),
        usersGrowth: calcGrowth(last30Users, prior30Users),
      },
      recentActivity: recentActivity.map((b) => ({
        id: b.id,
        type: 'booking',
        description: `${b.user?.name || 'User'} booked ${b.route?.fromCity || '?'} → ${b.route?.toCity || '?'}`,
        amount: b.totalAmount,
        status: b.status,
        createdAt: b.createdAt,
      })),
    };
  }

  // ─── User methods ──────────────────────────────────────────────────────────
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { bookings: true } },
        provider: { select: { id: true, companyName: true, status: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, passengers, providers, admins, newUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { role: UserRole.PASSENGER } }),
        this.prisma.user.count({ where: { role: UserRole.PROVIDER } }),
        this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
        this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      byRole: { passengers, providers, admins },
      newUsersLast30Days: newUsers,
    };
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === adminId)
      throw new BadRequestException('Cannot change your own role');
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN)
      throw new BadRequestException('Cannot demote admin users');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === adminId)
      throw new BadRequestException('Cannot delete yourself');
    if (user.role === UserRole.ADMIN)
      throw new BadRequestException('Cannot delete admin users');

    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.warn(`User ${userId} deleted by admin ${adminId}`);
    await this.invalidateUsersCache();
    return { message: 'User deleted successfully' };
  }

  // ─── Provider methods ──────────────────────────────────────────────────────
  async getProviderById(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: { select: { name: true, email: true, phone: true, createdAt: true } },
        _count: { select: { vehicles: true } },
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  async getProviderStats() {
    const [total, verified, pending, rejected, suspended] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { status: ProviderStatus.VERIFIED } }),
      this.prisma.provider.count({ where: { status: ProviderStatus.PENDING } }),
      this.prisma.provider.count({ where: { status: ProviderStatus.REJECTED } }),
      this.prisma.provider.count({ where: { status: ProviderStatus.SUSPENDED } }),
    ]);
    return { total, verified, pending, rejected, suspended };
  }

  // ─── Booking methods ───────────────────────────────────────────────────────
  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        route: {
          include: {
            vehicle: {
              include: {
                provider: { select: { companyName: true, contactEmail: true } },
              },
            },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getBookingStats(params?: { startDate?: string; endDate?: string }) {
    const startDate = params?.startDate
      ? new Date(params.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = params?.endDate ? new Date(params.endDate) : new Date();

    // Redis cache (30s TTL)
    const cacheKey = `admin:bookingStats:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = { createdAt: { gte: startDate, lte: endDate } };

    const [totalBookings, confirmed, cancelled, completed, pending, revenue] =
      await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.CONFIRMED } }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.CANCELLED } }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.COMPLETED } }),
        this.prisma.booking.count({ where: { ...where, status: BookingStatus.PENDING } }),
        this.prisma.booking.aggregate({
          _sum: { totalAmount: true },
          where: {
            ...where,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          },
        }),
      ]);

    const result = {
      totalBookings,
      byStatus: { confirmed, cancelled, completed, pending },
      totalRevenue: revenue._sum.totalAmount || 0,
      conversionRate:
        totalBookings > 0
          ? Math.round(((confirmed + completed) / totalBookings) * 100)
          : 0,
      cancellationRate:
        totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0,
    };

    await this.redisService.set(cacheKey, result, 30);
    return result;
  }

  async updateBookingStatus(
    bookingId: string,
    status: string,
    adminId: string,
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const validStatuses = Object.values(BookingStatus);
    if (!validStatuses.includes(status as BookingStatus))
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);

    this.logger.log(`Booking ${bookingId} status updated: ${booking.status} → ${status} by admin ${adminId}`);

    // Invalidate booking caches
    const keys = await this.redisService.getKeys('admin:bookings:*');
    if (keys.length) await Promise.all(keys.map((k) => this.redisService.del(k)));

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as BookingStatus },
    });
  }

  // ─── Revenue Analytics ─────────────────────────────────────────────────────
  async getRevenueAnalytics(params?: {
    start?: string;
    end?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const { start, end, groupBy = 'day' } = params || {};
    const startDate = start
      ? new Date(start)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end ? new Date(end) : new Date();

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      select: { totalAmount: true, createdAt: true, status: true },
    });

    const getGroupKey = (date: Date) => {
      const d = new Date(date);
      if (groupBy === 'week') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        return firstDay.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return d.toISOString().split('T')[0];
    };

    const revenueByPeriod = new Map<string, number>();
    let totalRevenue = 0;

    bookings.forEach((b) => {
      const key = getGroupKey(b.createdAt);
      const prev = revenueByPeriod.get(key) || 0;
      revenueByPeriod.set(key, prev + b.totalAmount);
      totalRevenue += b.totalAmount;
    });

    const trend = Array.from(revenueByPeriod.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));

    const avgRevenue = trend.length > 0 ? totalRevenue / trend.length : 0;

    return {
      totalRevenue,
      avgRevenuePer: avgRevenue,
      trend,
      totalTransactions: bookings.length,
    };
  }

  // ─── Booking Analytics ─────────────────────────────────────────────────────
  async getBookingAnalytics(params?: {
    start?: string;
    end?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const { start, end, groupBy = 'day' } = params || {};
    const startDate = start
      ? new Date(start)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end ? new Date(end) : new Date();

    const bookings = await this.prisma.booking.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { totalAmount: true, createdAt: true, status: true },
    });

    const getGroupKey = (date: Date) => {
      const d = new Date(date);
      if (groupBy === 'week') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        return firstDay.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return d.toISOString().split('T')[0];
    };

    const byPeriod = new Map<string, { date: string; bookings: number; revenue: number; cancelled: number }>();
    const statusCounts = { CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0, PENDING: 0 };

    bookings.forEach((b) => {
      const key = getGroupKey(b.createdAt);
      const prev = byPeriod.get(key) || { date: key, bookings: 0, revenue: 0, cancelled: 0 };
      prev.bookings += 1;
      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) {
        prev.revenue += b.totalAmount;
      }
      if (b.status === BookingStatus.CANCELLED) prev.cancelled += 1;
      byPeriod.set(key, prev);
      if (statusCounts[b.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[b.status as keyof typeof statusCounts]++;
      }
    });

    const trend = Array.from(byPeriod.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      totalBookings: bookings.length,
      statusDistribution: statusCounts,
      trend,
    };
  }

  // ─── Growth Metrics ────────────────────────────────────────────────────────
  async getGrowthMetrics(params?: { months?: number }) {
    const months = Number(params?.months) || 6;

    // Redis cache (2 minutes)
    const cacheKey = `admin:growth:${months}`;
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) return cached;

    // Build date ranges for all months
    const ranges = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - 1 - i));
      return {
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    });

    // Batch all queries in parallel instead of sequential loop
    const queries = ranges.flatMap(r => [
      this.prisma.user.count({ where: { createdAt: { gte: r.start, lte: r.end } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: r.start, lte: r.end } } }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: r.start, lte: r.end },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      }),
      this.prisma.provider.count({ where: { createdAt: { gte: r.start, lte: r.end } } }),
    ]);

    const results = await Promise.all(queries);

    const result = ranges.map((r, i) => ({
      month: r.month,
      users: results[i * 4] as number,
      bookings: results[i * 4 + 1] as number,
      revenue: (results[i * 4 + 2] as any)?._sum?.totalAmount || 0,
      providers: results[i * 4 + 3] as number,
    }));

    await this.redisService.set(cacheKey, result, 120);
    return result;
  }

  // ─── System Overview ───────────────────────────────────────────────────────
  async getSystemOverview() {
    const cacheKey = 'admin:system:overview';
    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      totalProviders,
      verifiedProviders,
      totalBookings,
      revenueResult,
      openTickets,
      pendingProviders,
      avgRatingRes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { status: ProviderStatus.VERIFIED } }),
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.provider.count({ where: { status: ProviderStatus.PENDING } }),
      this.prisma.feedback.aggregate({
        _avg: { rating: true },
        where: { rating: { not: null } },
      }),
    ]);

    const result = {
      users: { total: totalUsers, active: activeUsers, inactiveRate: totalUsers > 0 ? Math.round(((totalUsers - activeUsers) / totalUsers) * 100) : 0 },
      providers: { total: totalProviders, verified: verifiedProviders, verificationRate: totalProviders > 0 ? Math.round((verifiedProviders / totalProviders) * 100) : 0 },
      bookings: { total: totalBookings },
      revenue: { total: revenueResult._sum.totalAmount || 0 },
      alerts: { openTickets, pendingProviders },
      platform: { avgRating: avgRatingRes._avg.rating ? Number(avgRatingRes._avg.rating.toFixed(2)) : 0 },
      generatedAt: now.toISOString(),
    };

    await this.redisService.set(cacheKey, result, 120);
    return result;
  }

  // ─── Auditing and Settings ──────────────────────────────────────────────────
  async logAdminAction(adminId: string, action: string, entityType: string, entityId: string, details?: any, ipAddress?: string, userAgent?: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId,
          action,
          entityType,
          entityId,
          details: details ? JSON.parse(JSON.stringify(details)) : null,
          ipAddress,
          userAgent,
        }
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${action}: ${error.message}`);
    }
  }

  async getAuditLogs(params: { page?: number; limit?: number; action?: string; adminId?: string; entityType?: string }) {
    const { page = 1, limit = 20, action, adminId, entityType } = params;

    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Number(page) - 1) * parsedLimit;

    const where: any = {};
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (entityType) where.entityType = entityType;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: Number(page),
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      }
    };
  }

  async getAccessLogs(params: { page?: number; limit?: number; method?: string; statusCode?: number; ipAddress?: string; userId?: string }) {
    const { page = 1, limit = 50, method, statusCode, ipAddress, userId } = params;

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const skip = (Number(page) - 1) * parsedLimit;

    const where: any = {};
    if (method) where.method = method;
    if (statusCode) where.statusCode = Number(statusCode);
    if (ipAddress) where.ipAddress = { contains: ipAddress, mode: 'insensitive' };
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.accessLog.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accessLog.count({ where })
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: Number(page),
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      }
    };
  }

  async getSystemSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });
  }

  async updateSystemSetting(key: string, value: any, description: string, adminId: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: JSON.parse(JSON.stringify(value)),
        description,
        updatedBy: adminId,
      },
      create: {
        key,
        value: JSON.parse(JSON.stringify(value)),
        description,
        updatedBy: adminId,
      }
    });

    await this.logAdminAction(adminId, 'UPDATE_SETTING', 'SystemSetting', setting.id, { key, value });
    return setting;
  }
}
