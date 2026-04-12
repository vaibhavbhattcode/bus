import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class ApiMetricsInterceptor implements NestInterceptor {
  private lastRedisErrorAt = 0;

  constructor(@InjectQueue('metrics') private readonly metricsQueue: Queue) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req) return next.handle();
    const { method, url, user } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res?.statusCode || 200;
          this.metricsQueue.add('api-metric', {
            method, url, statusCode,
            durationMs: Date.now() - start,
            userId: user?.id || undefined,
          }, { removeOnComplete: true, removeOnFail: true }).catch(() => {});
        },
        error: () => {
          this.metricsQueue.add('api-metric', {
            method, url, statusCode: 500,
            durationMs: Date.now() - start,
          }, { removeOnComplete: true, removeOnFail: true }).catch(() => {});
        },
      }),
    );
  }
}
