import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
    private logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json(),
                winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
                    let msg = `${timestamp} [${level.toUpperCase()}] ${context ? `[${context}]` : ''} ${message}`;
                    if (Object.keys(meta).length > 0) {
                        msg += ` ${JSON.stringify(meta)}`;
                    }
                    if (trace) {
                        msg += `\n${trace}`;
                    }
                    return msg;
                })
            ),
            transports: [
                // Console transport
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize({ all: true }),
                        winston.format.printf(({ timestamp, level, message, context }) => {
                            return `${timestamp} ${level} ${context ? `[${context}]` : ''} ${message}`;
                        })
                    ),
                }),
                // File transport for errors
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                }),
                // File transport for all logs
                new winston.transports.File({
                    filename: 'logs/combined.log',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                }),
            ],
            exceptionHandlers: [
                new winston.transports.File({ filename: 'logs/exceptions.log' }),
            ],
            rejectionHandlers: [
                new winston.transports.File({ filename: 'logs/rejections.log' }),
            ],
        });
    }

    log(message: string, context?: string) {
        this.logger.info(message, { context });
    }

    error(message: string, trace?: string, context?: string) {
        this.logger.error(message, { context, trace });
    }

    warn(message: string, context?: string) {
        this.logger.warn(message, { context });
    }

    debug(message: string, context?: string) {
        this.logger.debug(message, { context });
    }

    verbose(message: string, context?: string) {
        this.logger.verbose(message, { context });
    }

    // Additional method for structured logging
    logStructured(level: string, message: string, metadata: any = {}) {
        this.logger.log(level, message, metadata);
    }

    // Log API requests
    logRequest(method: string, url: string, userId?: string, duration?: number) {
        this.logger.info('API Request', {
            context: 'API',
            method,
            url,
            userId,
            duration: duration ? `${duration}ms` : undefined,
        });
    }

    // Log database queries
    logQuery(query: string, duration?: number) {
        this.logger.debug('Database Query', {
            context: 'Database',
            query,
            duration: duration ? `${duration}ms` : undefined,
        });
    }

    // Log authentication events
    logAuth(event: string, userId?: string, metadata?: any) {
        this.logger.info('Auth Event', {
            context: 'Auth',
            event,
            userId,
            ...metadata,
        });
    }

    // Log business events
    logBusinessEvent(event: string, metadata: any = {}) {
        this.logger.info('Business Event', {
            context: 'Business',
            event,
            ...metadata,
        });
    }
}
