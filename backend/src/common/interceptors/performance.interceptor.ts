import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SLOW_REQUEST_THRESHOLD_MS = 500;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PerformanceInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const start = Date.now();
        const req = context.switchToHttp().getRequest();
        const { method, url } = req;

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - start;
                if (duration > SLOW_REQUEST_THRESHOLD_MS) {
                    this.logger.warn(
                        `Slow request detected: ${method} ${url} took ${duration}ms`,
                    );
                }
            }),
        );
    }
}
