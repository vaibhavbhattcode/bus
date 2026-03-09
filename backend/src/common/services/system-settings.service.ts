import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

/** Default insurance amount per seat (₹). Overridden by SystemSetting in DB. */
const DEFAULT_INSURANCE_RATE = 15;
const CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class SystemSettingsService {
    private readonly logger = new Logger(SystemSettingsService.name);

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService,
    ) { }

    /**
     * Generic getter with Redis cache layer.
     * Parses JSON values stored in the DB.
     */
    async get<T>(key: string, defaultValue: T): Promise<T> {
        const cacheKey = `setting:${key}`;

        // 1. Try Redis cache first
        const cached = await this.redisService.get<T>(cacheKey);
        if (cached !== null) return cached;

        // 2. Fetch from DB
        try {
            const setting = await (this.prisma as any).systemSetting.findUnique({ where: { key } });
            if (setting) {
                const value = setting.value as unknown as T;
                await this.redisService.set(cacheKey, value, CACHE_TTL_SECONDS);
                return value;
            }
        } catch (err) {
            this.logger.error(`Failed to fetch system setting "${key}"`, err);
        }

        return defaultValue;
    }

    /**
     * Generic setter – upserts the setting and busts cache.
     */
    async set(key: string, value: unknown, description?: string): Promise<void> {
        await (this.prisma as any).systemSetting.upsert({
            where: { key },
            update: { value: value as any, description },
            create: { key, value: value as any, description },
        });
        await this.redisService.del(`setting:${key}`);
        this.logger.log(`System setting "${key}" updated`);
    }

    // ─────────────────────────────────────────────────────────────
    //  Convenience accessors for commonly used settings
    // ─────────────────────────────────────────────────────────────

    /** Insurance rate per seat in INR */
    async getInsuranceRatePerSeat(): Promise<number> {
        return this.get<number>('insurance_rate_per_seat', DEFAULT_INSURANCE_RATE);
    }

    /** Cancellation policy thresholds { hours: number; refundPct: number }[] */
    async getCancellationPolicy(): Promise<Array<{ hours: number; refundPct: number }>> {
        return this.get('cancellation_policy', [
            { hours: 24, refundPct: 100 },
            { hours: 12, refundPct: 50 },
            { hours: 0, refundPct: 0 },
        ]);
    }

    /** Maximum seats a single user can book per route */
    async getMaxSeatsPerBooking(): Promise<number> {
        return this.get<number>('max_seats_per_booking', 6);
    }

    // ─────────────────────────────────────────────────────────────
    //  Dynamic Pricing Settings
    // ─────────────────────────────────────────────────────────────

    /** Dynamic pricing multiplier rules (e.g. 1.1 for +10% surge, 0.85 for -15% discount) */
    async getDynamicPricingRules(): Promise<{ surgePct: number; discountPct: number; surgeThresholdPx: number; discountThresholdPx: number }> {
        return this.get('dynamic_pricing_rules', {
            surgePct: 10,              // +10% price bump
            surgeThresholdPx: 80,      // when > 80% full
            discountPct: 15,           // -15% price drop
            discountThresholdPx: 30,   // when < 30% full
        });
    }

    /** Is the dynamic pricing engine enabled globally? */
    async isDynamicPricingEnabled(): Promise<boolean> {
        return this.get<boolean>('dynamic_pricing_enabled', true);
    }

    // ─────────────────────────────────────────────────────────────
    //  Auth & OTP Settings
    // ─────────────────────────────────────────────────────────────

    /** Is OTP phone login universally enabled? */
    async isOtpLoginEnabled(): Promise<boolean> {
        return this.get<boolean>('otp_login_enabled', true);
    }

    /** Maximum OTP attempts before locking the phone number */
    async getMaxOtpAttempts(): Promise<number> {
        return this.get<number>('max_otp_attempts', 3);
    }
}
