import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiMetricsInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req) return next.handle();
    const { method, url, user } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: async () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res?.statusCode || 200;
          const duration = Date.now() - start;
          try {
            await this.prisma.apiMetric.create({
              data: {
                method,
                url,
                statusCode,
                durationMs: duration,
                userId: user?.id || undefined,
              },
            });
          } catch {
            // swallow errors to not affect response
          }
        },
        error: async () => {
          const duration = Date.now() - start;
          try {
            await this.prisma.apiMetric.create({
              data: {
                method,
                url,
                statusCode: 500,
                durationMs: duration,
              },
            });
          } catch {}
        },
      }),
    );
  }
}
