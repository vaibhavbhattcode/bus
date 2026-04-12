import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { ApiMetricsInterceptor } from './common/interceptors/api-metrics.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import * as fs from 'fs';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Ensure logs directory exists
  const logsDir = join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logger = WinstonModule.createLogger({
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          isProduction ? winston.format.json() : winston.format.colorize(),
          isProduction
            ? winston.format.printf(({ timestamp, level, message, context }) =>
              JSON.stringify({ timestamp, level, context, message }),
            )
            : winston.format.printf(
              ({ timestamp, level, message, context, ms }) =>
                `${timestamp} ${level} [${context || 'Application'}] ${message} ${ms}`,
            ),
        ),
      }),
      // Persistent error log file (rotates daily)
      new winston.transports.File({
        filename: join(logsDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 10 * 1024 * 1024, // 10MB per file
        maxFiles: 30,              // Keep 30 files
      }),
      // Combined log file
      new winston.transports.File({
        filename: join(logsDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 7,
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();
  
  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} received. Starting graceful shutdown...`, 'Bootstrap');
    
    try {
      // Stop accepting new requests
      await app.close();
      logger.log('Application closed successfully', 'Bootstrap');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Enable GZIP compression
  app.use(compression());

  // Cookie parser (required for httpOnly refresh token cookie)
  app.use(cookieParser());

  // Request body size limits (prevent DoS attacks — 100kb is sufficient for a booking API)
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ limit: '100kb', extended: true }));

  // Strict CORS Configuration - define allowed origins first
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

  // Enhanced Security Headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true, // Remove X-Powered-By header
  }));

  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow all localhost ports to easily work with Vite
      const isLocalhostDev = process.env.NODE_ENV !== 'production' && origin && origin.startsWith('http://localhost:');
      if (!origin || allowedOrigins.includes(origin) || isLocalhostDev) {
        callback(null, true);
      } else {
        callback(null, false); // Returning false cleanly rejects instead of throwing 500 Internal Server Error
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe with strict security settings
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true, // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: true,
    },
    // Prevent prototype pollution
    forbidUnknownValues: true,
  }));

  // Swagger Documentation – ONLY enabled in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('BusBook API')
      .setDescription(
        'Complete API reference for the BusBook transport booking platform',
      )
      .setVersion('2.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'Authentication & password management')
      .addTag('Bookings', 'Booking management')
      .addTag('Routes', 'Route search and management')
      .addTag('Payments', 'Payment processing')
      .addTag('Admin', 'Admin operations')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors — order matters:
  // 1. ErrorLoggingInterceptor  → catches all errors and logs them
  // 2. PerformanceInterceptor   → warns when requests exceed SLA threshold
  // 3. ResponseInterceptor      → wraps successful responses in standard format
  app.useGlobalInterceptors(
    new ErrorLoggingInterceptor(),
    new PerformanceInterceptor(),
    new ResponseInterceptor(),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();
  
  logger.log(`🚀 Application running: ${appUrl}`, 'Bootstrap');
  logger.log(`🛡️  Security: CORS, Helmet, Rate Limiting enabled`, 'Bootstrap');
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
  logger.log(`📦 Allowed Origins: ${allowedOrigins.join(', ')}`, 'Bootstrap');
  
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📄 Swagger Docs: ${appUrl}/api/docs`, 'Bootstrap');
  } else {
    logger.log('📄 Swagger Docs: DISABLED (production mode)', 'Bootstrap');
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
