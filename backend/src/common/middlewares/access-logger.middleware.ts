import { Injectable, NestMiddleware, Logger, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class AccessLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(AccessLoggerMiddleware.name);
    // Rate-limit error logging: only log Redis failures once per minute
    private lastRedisErrorAt = 0;

    constructor(@InjectQueue('metrics') private readonly metricsQueue: Queue) { }

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, ip } = req;
        const userAgent = req.headers['user-agent'] || '';
        const startTime = Date.now();

        res.on('finish', () => {
            const { statusCode } = res;
            const durationMs = Date.now() - startTime;

            if (method === 'OPTIONS' && statusCode >= 200 && statusCode < 300) return;

            const parser = new UAParser(userAgent);
            const browser = parser.getBrowser().name || 'Unknown';
            const os = parser.getOS().name || 'Unknown';
            const device = parser.getDevice().type || 'Desktop';
            const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || ip || '127.0.0.1';

            let country = 'Unknown';
            let city = 'Unknown';
            if (clientIp) {
                const geo = geoip.lookup(clientIp);
                if (geo) { country = geo.country; city = geo.city; }
            }

            // @ts-ignore
            const userId = req.user?.id || null;

            // Fire-and-forget via queue — does not block the response
            this.metricsQueue.add('access-log', {
                method, url: originalUrl, statusCode, durationMs,
                ipAddress: clientIp, userAgent, browser, os, device,
                country, city, userId,
            }, { removeOnComplete: true, removeOnFail: true }).catch((err) => {
                const now = Date.now();
                if (now - this.lastRedisErrorAt > 60_000) {
                    this.lastRedisErrorAt = now;
                    this.logger.warn(`Access log queue unavailable (Redis down?): ${err.message}`);
                }
            });
        });

        next();
    }
}
