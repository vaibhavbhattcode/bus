import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import * as fs from 'fs';

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

  // Enable graceful shutdown hooks (required for Docker/Kubernetes)
  app.enableShutdownHooks();

  // Enable GZIP compression
  app.use(compression());

  // Cookie parser (required for httpOnly refresh token cookie)
  app.use(cookieParser());

  // Security Headers
  app.use(helmet());

  // Strict CORS Configuration
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Swagger Documentation – only enabled outside production
  if (!isProduction) {
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

  // Global Interceptors – order matters: error logging, performance, logging, transform
  app.useGlobalInterceptors(
    new ErrorLoggingInterceptor(),
    new PerformanceInterceptor(),
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: ${await app.getUrl()}`, 'Bootstrap');
  logger.log(`🛡️  Security: CORS and Helmet enabled`, 'Bootstrap');
  logger.log(`📄 Swagger Docs available at: ${await app.getUrl()}/api/docs`, 'Bootstrap');
}
bootstrap();
