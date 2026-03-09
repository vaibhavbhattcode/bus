import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { ApplyPromoCodeDto } from './dto/apply-promo-code.dto';
import { PromoCodeStatus, PromoCodeType } from 'prisma-client-custom';

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  private async updateExpiredStatuses() {
    const now = new Date();
    await this.prisma.promoCode.updateMany({
      where: {
        status: PromoCodeStatus.ACTIVE,
        validUntil: { lt: now },
      },
      data: {
        status: PromoCodeStatus.EXPIRED,
      },
    });
  }

  async create(createPromoCodeDto: CreatePromoCodeDto) {
    const code = createPromoCodeDto.code.toUpperCase();

    const existing = await this.prisma.promoCode.findUnique({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException('Promo code already exists');
    }

    const validFrom = new Date(createPromoCodeDto.validFrom);
    const validUntil = new Date(createPromoCodeDto.validUntil);

    let status = createPromoCodeDto.status ?? PromoCodeStatus.ACTIVE;
    const now = new Date();
    if (validUntil < now) {
      status = PromoCodeStatus.EXPIRED;
    }

    return this.prisma.promoCode.create({
      data: {
        code,
        description: createPromoCodeDto.description,
        type: createPromoCodeDto.type,
        value: createPromoCodeDto.value,
        minAmount: createPromoCodeDto.minAmount,
        maxUses: createPromoCodeDto.maxUses,
        validFrom,
        validUntil,
        status,
        applicableRoutes: createPromoCodeDto.applicableRoutes,
      },
    });
  }

  async findAll() {
    await this.updateExpiredStatuses();

    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { id },
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found');
    }

    return promoCode;
  }

  async update(id: string, updateData: Partial<CreatePromoCodeDto>) {
    const data: any = { ...updateData };

    if (updateData.validFrom) {
      data.validFrom = new Date(updateData.validFrom);
    }

    if (updateData.validUntil) {
      const validUntil = new Date(updateData.validUntil);
      data.validUntil = validUntil;

      const now = new Date();
      if (!updateData.status && validUntil < now) {
        data.status = PromoCodeStatus.EXPIRED;
      }
    }

    return this.prisma.promoCode.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.promoCode.delete({
      where: { id },
    });
  }

  async applyPromoCode(applyDto: ApplyPromoCodeDto) {
    const { code, bookingAmount, routeId } = applyDto;

    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      throw new BadRequestException('Invalid promo code');
    }

    const now = new Date();

    if (now > promoCode.validUntil) {
      if (promoCode.status === PromoCodeStatus.ACTIVE) {
        await this.prisma.promoCode.update({
          where: { id: promoCode.id },
          data: { status: PromoCodeStatus.EXPIRED },
        });
      }
      throw new BadRequestException('Promo code is expired');
    }

    if (now < promoCode.validFrom) {
      throw new BadRequestException('Promo code is not yet valid');
    }

    if (promoCode.status !== PromoCodeStatus.ACTIVE) {
      throw new BadRequestException('Promo code is inactive');
    }

    // 3. Check Usage Limits
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    // 4. Check Min Amount
    if (promoCode.minAmount && bookingAmount < promoCode.minAmount) {
      throw new BadRequestException(`Minimum booking amount of ₹${promoCode.minAmount} required`);
    }

    // 5. Check Route Applicability
    if (promoCode.applicableRoutes && promoCode.applicableRoutes.length > 0) {
      if (!routeId || !promoCode.applicableRoutes.includes(routeId)) {
        throw new BadRequestException('This promo code is not applicable for this route');
      }
    }

    // Calculate Discount
    let discountAmount = 0;
    if (promoCode.type === PromoCodeType.PERCENTAGE) {
      discountAmount = (bookingAmount * promoCode.value) / 100;
      if (promoCode.maxDiscount && discountAmount > promoCode.maxDiscount) {
        discountAmount = promoCode.maxDiscount;
      }
    } else {
      discountAmount = promoCode.value;
    }

    // Ensure discount doesn't exceed booking amount
    discountAmount = Math.min(discountAmount, bookingAmount);

    return {
      promoCodeId: promoCode.id,
      code: promoCode.code,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.max(0, bookingAmount - discountAmount),
      message: 'Promo code applied successfully',
    };
  }

  async incrementUsage(id: string, bookingId: string, userId: string, discountAmount: number) {
    return this.prisma.$transaction([
        this.prisma.promoCode.update({
            where: { id },
            data: { usedCount: { increment: 1 } },
        }),
        this.prisma.promoCodeUsage.create({
            data: {
                promoCodeId: id,
                bookingId,
                userId,
                discountAmount
            }
        })
    ]);
  }
}
