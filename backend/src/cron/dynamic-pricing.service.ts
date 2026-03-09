import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettingsService } from '../common/services/system-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'prisma-client-custom';

/**
 * Dynamic Pricing Engine
 * ──────────────────────
 * Runs every 30 minutes and adjusts route prices based on seat demand.
 *
 * Rules (configurable via SystemSettings):
 *  - Occupancy ≥ 80% and journey > 4h from now → price +10% (demand surcharge)
 *  - Occupancy ≤ 30% and journey ≤ 24h from now → price -15% (fill seats discount)
 */
@Injectable()
export class DynamicPricingService {
    private readonly logger = new Logger(DynamicPricingService.name);

    constructor(
        private prisma: PrismaService,
        private systemSettings: SystemSettingsService,
        private notificationsService: NotificationsService,
    ) { }

    /** Scheduled every 30 minutes */
    @Cron('0 */30 * * * *')
    async adjustPrices(): Promise<void> {
        const isEnabled = await this.systemSettings.isDynamicPricingEnabled();
        if (!isEnabled) {
            this.logger.debug('Dynamic pricing is disabled via system settings.');
            return;
        }

        this.logger.log('Running dynamic pricing engine...');

        const rules = await this.systemSettings.getDynamicPricingRules();

        const now = new Date();
        const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Fetch upcoming routes (within 24h) with seat data
        const routes = await (this.prisma as any).route.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                date: { gte: now, lte: twentyFourHoursFromNow },
                totalSeats: { gt: 0 },
            },
            select: {
                id: true,
                fromCity: true,
                toCity: true,
                date: true,
                departureTime: true,
                price: true,
                totalSeats: true,
                availableSeats: true,
            },
        });

        let surgeCount = 0;
        let discountCount = 0;

        for (const route of routes) {
            // Occupancy percentage (0 to 100)
            const occupancyPct =
                ((route.totalSeats - route.availableSeats) / route.totalSeats) * 100;

            // Compute actual departure datetime
            const [h, m] = route.departureTime.split(':').map(Number);
            const departure = new Date(route.date);
            departure.setHours(h, m, 0, 0);

            let newPrice: number | null = null;
            let reason = '';

            if (occupancyPct >= rules.surgeThresholdPx && departure > fourHoursFromNow) {
                // High demand + departure not imminent → surge
                const multiplier = 1 + (rules.surgePct / 100);
                newPrice = Math.round(route.price * multiplier * 100) / 100;
                reason = `Demand surge: ${occupancyPct.toFixed(0)}% occupancy (+${rules.surgePct}%)`;
                surgeCount++;
            } else if (occupancyPct <= rules.discountThresholdPx) {
                // Low demand with departure soon → discount
                const multiplier = 1 - (rules.discountPct / 100);
                newPrice = Math.round(route.price * multiplier * 100) / 100;
                reason = `Low demand discount: ${occupancyPct.toFixed(0)}% occupancy (-${rules.discountPct}%)`;
                discountCount++;
            }

            if (newPrice !== null && newPrice !== route.price) {
                await (this.prisma as any).route.update({
                    where: { id: route.id },
                    data: { price: newPrice },
                });

                this.logger.log(
                    `Price updated for route ${route.fromCity}→${route.toCity}: ₹${route.price} → ₹${newPrice} (${reason})`,
                );

                // Notify users with price alerts for this route
                await this.triggerPriceAlerts(route, newPrice);
            }
        }

        this.logger.log(
            `Dynamic pricing complete: ${surgeCount} surges, ${discountCount} discounts applied.`,
        );
    }

    /** Notify users who set price alerts for this route if price dropped */
    private async triggerPriceAlerts(route: any, newPrice: number): Promise<void> {
        const alerts = await (this.prisma as any).priceAlert.findMany({
            where: {
                fromCity: { equals: route.fromCity, mode: 'insensitive' },
                toCity: { equals: route.toCity, mode: 'insensitive' },
                status: 'ACTIVE',
                type: 'PRICE_DROP',
                targetPrice: { gte: newPrice },
            },
        });

        await Promise.allSettled(
            alerts.map(async (alert: any) => {
                await this.notificationsService.create(
                    alert.userId,
                    NotificationType.ALERT,
                    '💰 Price Drop Alert!',
                    `Route ${route.fromCity} → ${route.toCity} is now ₹${newPrice}! Book now before seats fill up.`,
                    `/search?from=${route.fromCity}&to=${route.toCity}`,
                );

                // Mark alert as triggered
                await (this.prisma as any).priceAlert.update({
                    where: { id: alert.id },
                    data: { status: 'TRIGGERED', triggeredAt: new Date() },
                });
            }),
        );
    }
}
