import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findByEmailOrPhone(identifier: string) {
    if (!identifier) return null;
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  async findByEmail(email: string) {
    if (!email) return null;
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('phone')) {
          throw new Error('User with this phone number already exists');
        }
        if (Array.isArray(target) && target.includes('email')) {
          throw new Error('User with this email already exists');
        }
      }
      throw error;
    }
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async getUserStats(id: string) {
    const totalTrips = await this.prisma.booking.count({
      where: {
        userId: id,
        status: { in: ['COMPLETED', 'CONFIRMED'] }
      }
    });

    const user = await this.findById(id);

    return {
      totalTrips,
      memberSince: user?.createdAt,
      isVerified: true, // Mock logic, or check specific fields
    };
  }
}
