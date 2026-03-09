import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { SearchRoutesDto, SortBy } from './dto/search-routes.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RoutesService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) { }

  private async clearSearchCache() {
    const keys = await this.redisService.getKeys('search:*');
    for (const key of keys) {
      await this.redisService.del(key);
    }
  }

  async create(providerId: string, dto: CreateRouteDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: dto.vehicleId,
        providerId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found or not owned by provider');
    }

    if (!vehicle.isActive) {
      throw new BadRequestException('Cannot create route for an inactive vehicle');
    }

    const routeDate = new Date(dto.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (routeDate < today) {
      throw new BadRequestException('Cannot create route for a past date');
    }

    // Check for vehicle availability/collisions
    const departure = this.combineDateAndTime(dto.date, dto.departureTime);
    const arrival = dto.arrivalDate
      ? this.combineDateAndTime(dto.arrivalDate, dto.arrivalTime)
      : this.combineDateAndTime(dto.date, dto.arrivalTime);

    // Ensure arrival is after departure
    if (arrival <= departure) {
      throw new BadRequestException('Arrival time must be after departure time');
    }

    // Buffer time (e.g., 1 hour for cleaning/maintenance)
    const bufferMinutes = 60;
    const departureWithBuffer = new Date(departure.getTime() - bufferMinutes * 60000);
    const arrivalWithBuffer = new Date(arrival.getTime() + bufferMinutes * 60000);

    const conflictingRoute = await this.prisma.route.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        deletedAt: null,
        OR: [
          {
            // Existing route starts during this new route
            departureTime: {
              gte: dto.departureTime,
            },
            date: {
              gte: departureWithBuffer,
              lte: arrivalWithBuffer,
            }
          },
          {
            // Overlapping date range (more robust check for multi-day routes)
            date: {
              lte: arrivalWithBuffer,
            },
            arrivalDate: {
              gte: departureWithBuffer,
            }
          }
        ]
      }
    });

    // For simplicity in this demo, let's use a more direct check for same-day/next-day collisions
    const overlappingRoutes = await this.prisma.route.findMany({
      where: {
        vehicleId: dto.vehicleId,
        deletedAt: null,
        date: {
          gte: new Date(new Date(dto.date).getTime() - 86400000), // Day before
          lte: new Date(new Date(dto.date).getTime() + 86400000), // Day after
        }
      }
    });

    for (const existing of overlappingRoutes) {
      const exDep = this.combineDateAndTime(existing.date.toISOString(), existing.departureTime);
      const exArr = existing.arrivalDate
        ? this.combineDateAndTime(existing.arrivalDate.toISOString(), existing.arrivalTime)
        : this.combineDateAndTime(existing.date.toISOString(), existing.arrivalTime);

      const exDepBuffer = new Date(exDep.getTime() - bufferMinutes * 60000);
      const exArrBuffer = new Date(exArr.getTime() + bufferMinutes * 60000);

      if (
        (departure >= exDepBuffer && departure <= exArrBuffer) ||
        (arrival >= exDepBuffer && arrival <= exArrBuffer) ||
        (departure <= exDepBuffer && arrival >= exArrBuffer)
      ) {
        throw new BadRequestException(`Vehicle is busy on another route from ${existing.departureTime} to ${existing.arrivalTime} (${existing.fromCity} - ${existing.toCity})`);
      }
    }

    const route = await this.prisma.route.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        totalSeats: vehicle.totalSeats,
        availableSeats: vehicle.totalSeats,
        deletedAt: null,
      },
      include: {
        vehicle: {
          include: {
            provider: {
              select: {
                companyName: true,
                rating: true,
                totalReviews: true,
              },
            },
          },
        },
      },
    });

    await this.clearSearchCache();
    return route;
  }

  async search(dto: SearchRoutesDto) {
    const cacheKey = `search:${JSON.stringify(dto)}`;
    const cachedResults = await this.redisService.get<any[]>(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    const where: any = {
      deletedAt: null,
      isActive: true,
    };

    if (dto.fromCity) {
      where.fromCity = { contains: dto.fromCity, mode: 'insensitive' };
    }
    if (dto.toCity) {
      where.toCity = { contains: dto.toCity, mode: 'insensitive' };
    }
    if (dto.date) {
      const date = new Date(dto.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = {
        gte: date,
        lt: nextDay,
      };
    }

    if (dto.seats) {
      where.availableSeats = {
        gte: dto.seats,
      };
    }

    // Price Range
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.price = {};
      if (dto.minPrice !== undefined) where.price.gte = dto.minPrice;
      if (dto.maxPrice !== undefined) where.price.lte = dto.maxPrice;
    }

    // Vehicle Filters (Operator, Type, Amenities)
    const vehicleWhere: any = {};
    let hasVehicleFilters = false;

    if (dto.operatorId) {
      vehicleWhere.providerId = dto.operatorId;
      hasVehicleFilters = true;
    }

    if (dto.amenities) {
      const amenitiesList = dto.amenities.split(',').map(a => a.trim());
      if (amenitiesList.length > 0) {
        // Prisma MongoDB supports hasEvery for string arrays
        vehicleWhere.amenities = { hasEvery: amenitiesList };
        hasVehicleFilters = true;
      }
    }

    if (dto.busType) {
      const types = dto.busType.split(',').map(t => t.trim().toLowerCase());
      // Logic: If user selects "AC", we check if amenities has "AC".
      // If "Sleeper", we check if amenities has "Sleeper" OR layout is "sleeper" or "1+1".
      // Since Prisma 'OR' inside relation filter can be tricky, let's try a simpler approach.
      // We will filter by amenities mainly.
      // Common types: AC, Non-AC, Sleeper, Seater.

      const amenityConditions = [];
      const layoutConditions = [];

      if (types.some(t => t.includes('ac') && !t.includes('non-ac'))) {
        amenityConditions.push('AC');
      }
      if (types.some(t => t.includes('sleeper'))) {
        // Either amenities has 'Sleeper' OR layout is 'sleeper'
        // This complex OR condition might need refined logic if strictness is required.
        // For now, let's assume 'Sleeper' is in amenities if it's a sleeper bus.
        amenityConditions.push('Sleeper');
      }

      if (amenityConditions.length > 0) {
        if (vehicleWhere.amenities) {
          vehicleWhere.amenities.hasEvery = [...(vehicleWhere.amenities.hasEvery || []), ...amenityConditions];
        } else {
          vehicleWhere.amenities = { hasEvery: amenityConditions };
        }
        hasVehicleFilters = true;
      }
    }

    if (hasVehicleFilters) {
      where.vehicle = vehicleWhere;
    }

    // Sorting
    const orderBy: any = {};
    if (dto.sortBy) {
      switch (dto.sortBy) {
        case SortBy.PRICE_ASC:
          orderBy.price = 'asc';
          break;
        case SortBy.PRICE_DESC:
          orderBy.price = 'desc';
          break;
        case SortBy.DEPARTURE_ASC:
          orderBy.departureTime = 'asc';
          break;
        case SortBy.DEPARTURE_DESC:
          orderBy.departureTime = 'desc';
          break;
        default:
          orderBy.date = 'asc'; // Fallback
      }
    } else {
      orderBy.date = 'asc';
    }

    const results = await this.prisma.route.findMany({
      where,
      include: {
        vehicle: {
          include: {
            provider: {
              select: {
                id: true, // Needed for filtering
                companyName: true,
                rating: true,
              },
            },
          },
        },
      },
      orderBy,
    });

    await this.redisService.set(cacheKey, results, 300); // Cache for 5 minutes
    return results;
  }

  async findById(id: string) {
    const cacheKey = `route:db:${id}`;
    const cachedRoute = await this.redisService.get<any>(cacheKey);
    if (cachedRoute) return cachedRoute;

    const route = await this.prisma.route.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        vehicle: {
          include: {
            provider: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                contactPhone: true,
                contactEmail: true,
                rating: true,
                totalReviews: true,
              },
            },
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Cache the route heavily for 1 minute (reads vastly outnumber writes for Route details)
    await this.redisService.set(cacheKey, route, 60);

    return route;
  }

  async findByProvider(providerId: string, filters?: any) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      vehicle: {
        providerId,
      },
      deletedAt: null,
    };

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = {
        gte: date,
        lt: nextDay,
      };
    }

    if (filters?.fromCity) {
      where.fromCity = { contains: filters.fromCity, mode: 'insensitive' };
    }

    if (filters?.toCity) {
      where.toCity = { contains: filters.toCity, mode: 'insensitive' };
    }

    if (filters?.isActive !== undefined) {
      const isActive = String(filters.isActive) === 'true';
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          bookings: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED'],
              },
            },
            select: {
              id: true,
              seats: true,
              status: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      }),
      this.prisma.route.count({ where }),
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

  async update(providerId: string, routeId: string, dto: UpdateRouteDto) {
    const route = await this.prisma.route.findFirst({
      where: {
        id: routeId,
        vehicle: {
          providerId,
        },
        deletedAt: null,
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    if (dto.date) {
      const routeDate = new Date(dto.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (routeDate < today) {
        throw new BadRequestException('Cannot update route to a past date');
      }
    }

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: dto.vehicleId,
          providerId,
          deletedAt: null,
        },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found or not owned by provider');
      }
    }

    const updatedRoute = await this.prisma.route.update({
      where: { id: routeId },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });

    await this.clearSearchCache();
    return updatedRoute;
  }

  async delete(providerId: string, id: string) {
    const route = await this.prisma.route.findFirst({
      where: {
        id,
        vehicle: {
          providerId,
        },
        deletedAt: null,
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found or not owned by provider');
    }

    // Check for existing bookings
    const bookingsCount = await this.prisma.booking.count({
      where: {
        routeId: id,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
    });

    if (bookingsCount > 0) {
      throw new BadRequestException(
        'Cannot delete route with existing bookings. Please cancel bookings first.',
      );
    }

    // Soft delete
    const deletedRoute = await this.prisma.route.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await this.clearSearchCache();
    return deletedRoute;
  }

  private combineDateAndTime(dateStr: string, timeStr: string): Date {
    const date = new Date(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  async getSeatAvailability(routeId: string) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        vehicle: true,
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
          select: {
            seatNumbers: true,
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Get all booked seats from confirmed/pending bookings
    const bookedSeats = new Set<string>();
    route.bookings.forEach((booking) => {
      booking.seatNumbers.forEach((seat) => bookedSeats.add(seat));
    });

    // Get locked seats from Redis
    const lockPattern = `lock:route:${routeId}:seat:*`;
    const lockKeys = await this.redisService.getKeys(lockPattern);
    const lockedSeats = new Set<string>();

    for (const key of lockKeys) {
      const seatNumber = key.split(':').pop();
      if (seatNumber) lockedSeats.add(seatNumber);
    }

    // Generate seat map
    const seats = [];
    for (let i = 1; i <= route.totalSeats; i++) {
      const seatNumber = i.toString();
      const isBooked = bookedSeats.has(seatNumber);
      const isLocked = lockedSeats.has(seatNumber);

      seats.push({
        number: seatNumber,
        available: !isBooked && !isLocked,
        booked: isBooked,
        locked: isLocked,
      });
    }

    return {
      routeId,
      totalSeats: route.totalSeats,
      availableSeats: route.availableSeats - lockedSeats.size,
      seatLayout: route.vehicle.seatLayout || '2+2',
      seats,
      bookedSeats: Array.from(bookedSeats),
      lockedSeats: Array.from(lockedSeats),
    };
  }

  async lockSeats(routeId: string, seatNumbers: string[], userId: string) {
    const LOCK_TTL = 600; // 10 minutes in seconds
    const lockedByOther: string[] = [];

    for (const seatNumber of seatNumbers) {
      const lockKey = `lock:route:${routeId}:seat:${seatNumber}`;
      const success = await this.redisService.setLock(lockKey, userId, LOCK_TTL);
      if (!success) {
        // Check if it's already locked by the same user
        const existingLock = await this.redisService.get<string>(lockKey);
        if (existingLock !== userId) {
          lockedByOther.push(seatNumber);
        }
      }
    }

    if (lockedByOther.length > 0) {
      throw new BadRequestException(`Seat(s) ${lockedByOther.join(', ')} are currently being booked by someone else.`);
    }

    return { success: true, message: 'Seats locked successfully for 10 minutes' };
  }

  async unlockSeats(routeId: string, seatNumbers: string[], userId: string) {
    for (const seatNumber of seatNumbers) {
      const lockKey = `lock:route:${routeId}:seat:${seatNumber}`;
      await this.redisService.releaseLock(lockKey, userId);
    }
    return { success: true };
  }
}
