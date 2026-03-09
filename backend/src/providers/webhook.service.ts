import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    /**
     * Fire webhooks for all active subscribers of an event type for a given provider.
     * Each delivery is signed with HMAC-SHA256 and runs independently (no one failure blocks others).
     */
    async dispatch(providerId: string, event: string, payload: Record<string, any>): Promise<void> {
        const subscriptions = await (this.prisma as any).webhookSubscription.findMany({
            where: { providerId, isActive: true, events: { has: event } },
        });

        if (!subscriptions.length) return;

        const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });

        await Promise.allSettled(
            subscriptions.map((sub: any) => this.deliver(sub, body, event)),
        );
    }

    /** Subscribe a provider to webhook events */
    async subscribe(providerId: string, url: string, events: string[]) {
        const secret = crypto.randomBytes(32).toString('hex');
        return (this.prisma as any).webhookSubscription.create({
            data: { providerId, url, secret, events },
        });
    }

    /** List provider's webhook subscriptions */
    async listSubscriptions(providerId: string) {
        return (this.prisma as any).webhookSubscription.findMany({
            where: { providerId },
            select: { id: true, url: true, events: true, isActive: true, createdAt: true },
        });
    }

    /** Delete a webhook subscription */
    async deleteSubscription(providerId: string, id: string) {
        return (this.prisma as any).webhookSubscription.deleteMany({
            where: { id, providerId },
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────

    /** HMAC-SHA256 signature for the payload */
    private sign(secret: string, body: string): string {
        return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
    }

    /** HTTP(S) delivery with timeout */
    private async deliver(subscription: any, body: string, event: string): Promise<void> {
        const signature = this.sign(subscription.secret, body);
        try {
            await this.httpPost(subscription.url, body, signature);
            this.logger.log(`Webhook delivered: ${event} → ${subscription.url}`);
        } catch (err: any) {
            this.logger.error(
                `Webhook delivery failed: ${event} → ${subscription.url}: ${err.message}`,
            );
        }
    }

    private httpPost(url: string, body: string, signature: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const lib = parsedUrl.protocol === 'https:' ? https : http;
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'X-BusBook-Signature': signature,
                    'X-BusBook-Event': signature,
                },
                timeout: 10000, // 10s timeout
            };

            const req = lib.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out'));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
