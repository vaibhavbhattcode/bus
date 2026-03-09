import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'prisma-client-custom';

/** Transaction types matching the Prisma enum */
export const WTxType = { CREDIT: 'CREDIT', DEBIT: 'DEBIT' } as const;

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService,
        private notificationsService: NotificationsService,
    ) { }

    // ─────────────────────────────────────────────────────────────
    //  Core Wallet Operations
    // ─────────────────────────────────────────────────────────────

    /** Get or create wallet for a user */
    async getOrCreate(userId: string) {
        const existing = await (this.prisma as any).wallet.findUnique({ where: { userId } });
        if (existing) return existing;

        return (this.prisma as any).wallet.create({
            data: { userId, balance: 0, totalCredit: 0, totalDebit: 0 },
        });
    }

    /** Get wallet with recent transactions */
    async getWallet(userId: string) {
        const cacheKey = `wallet:${userId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return cached;

        const wallet = await (this.prisma as any).wallet.findUnique({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!wallet) return this.getOrCreate(userId);

        await this.redisService.set(cacheKey, wallet, 60);
        return wallet;
    }

    /**
     * Credit the wallet – used for refunds, promotions, and admin credits.
     * All credit operations are idempotent using idempotencyKey.
     */
    async credit(
        userId: string,
        amount: number,
        description: string,
        bookingId?: string,
        idempotencyKey?: string,
    ) {
        if (amount <= 0) throw new BadRequestException('Credit amount must be positive');

        // Idempotency check
        if (idempotencyKey) {
            const existing = await this.redisService.get(`wallet:idempotency:${idempotencyKey}`);
            if (existing) {
                this.logger.warn(`Duplicate wallet credit skipped: ${idempotencyKey}`);
                return existing;
            }
        }

        const wallet = await this.getOrCreate(userId);

        const [updatedWallet, transaction] = await (this.prisma as any).$transaction([
            (this.prisma as any).wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { increment: amount },
                    totalCredit: { increment: amount },
                },
            }),
            (this.prisma as any).walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: WTxType.CREDIT,
                    amount,
                    status: 'COMPLETED',
                    description,
                    bookingId,
                },
            }),
        ]);

        // Cache idempotency key for 24h
        if (idempotencyKey) {
            await this.redisService.set(`wallet:idempotency:${idempotencyKey}`, transaction, 86400);
        }

        // Invalidate wallet cache
        await this.redisService.del(`wallet:${userId}`);

        // Send in-app notification
        await this.notificationsService.create(
            userId,
            NotificationType.PAYMENT_SUCCESS,
            'Wallet Credited',
            `₹${amount.toFixed(2)} has been added to your BusBook wallet. ${description}`,
            '/wallet',
        );

        return { wallet: updatedWallet, transaction };
    }

    /**
     * Debit the wallet – used during checkout when user pays with wallet balance.
     * Throws if insufficient balance.
     */
    async debit(
        userId: string,
        amount: number,
        description: string,
        bookingId?: string,
    ) {
        if (amount <= 0) throw new BadRequestException('Debit amount must be positive');

        const wallet = await this.getOrCreate(userId);

        if (wallet.balance < amount) {
            throw new BadRequestException(
                `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${amount.toFixed(2)}`,
            );
        }

        const [updatedWallet, transaction] = await (this.prisma as any).$transaction([
            (this.prisma as any).wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { decrement: amount },
                    totalDebit: { increment: amount },
                },
            }),
            (this.prisma as any).walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: WTxType.DEBIT,
                    amount,
                    status: 'COMPLETED',
                    description,
                    bookingId,
                },
            }),
        ]);

        await this.redisService.del(`wallet:${userId}`);

        return { wallet: updatedWallet, transaction };
    }

    /** Get paginated transaction history */
    async getTransactions(userId: string, page = 1, limit = 20) {
        const wallet = await this.getOrCreate(userId);
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            (this.prisma as any).walletTransaction.findMany({
                where: { walletId: wallet.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            (this.prisma as any).walletTransaction.count({ where: { walletId: wallet.id } }),
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
}
