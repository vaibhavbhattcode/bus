import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExperimentsService {
  constructor(private prisma: PrismaService) {}

  listActive(segment?: string) {
    const where: any = { active: true };
    if (segment) where.OR = [{ segment }, { segment: null }];
    return this.prisma.promoExperiment.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  recordEvent(data: { experimentId: string; userId?: string; variant: string; eventType: string; route?: string }) {
    return this.prisma.promoEvent.create({ data: {
      experimentId: data.experimentId,
      userId: data.userId,
      variant: data.variant,
      eventType: data.eventType,
      route: data.route,
    }});
  }
}
