import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class AccessLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(AccessLoggerMiddleware.name);

    constructor(private readonly prisma: PrismaService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, ip } = req;
        const userAgent = req.headers['user-agent'] || '';
        const startTime = Date.now();

        res.on('finish', async () => {
            const { statusCode } = res;
            const durationMs = Date.now() - startTime;

            // Ensure we don't log successful OPTIONS requests to avoid clutter
            if (method === 'OPTIONS' && statusCode >= 200 && statusCode < 300) {
                return;
            }

            const parser = new UAParser(userAgent);
            const browser = parser.getBrowser().name || 'Unknown';
            const os = parser.getOS().name || 'Unknown';
            const device = parser.getDevice().type || 'Desktop';

            // Attempt to extract IP from common proxy headers if needed
            const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || ip || '127.0.0.1';

            let country = 'Unknown';
            let city = 'Unknown';

            if (clientIp) {
                const geo = geoip.lookup(clientIp);
                if (geo) {
                    country = geo.country;
                    city = geo.city;
                }
            }

            // @ts-ignore - The user property might be added by Auth guards later in the request lifecycle
            const userId = req.user?.id || null;

            try {
                await this.prisma.accessLog.create({
                    data: {
                        method,
                        url: originalUrl,
                        statusCode,
                        durationMs,
                        ipAddress: clientIp,
                        userAgent,
                        browser,
                        os,
                        device,
                        country,
                        city,
                        userId,
                    },
                });
            } catch (error) {
                this.logger.error(`Failed to save access log: ${error.message}`);
            }
        });

        next();
    }
}
