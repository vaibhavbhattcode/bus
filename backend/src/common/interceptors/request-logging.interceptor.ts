import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggerService } from '../logger/custom-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: CustomLoggerService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const userId = request.user?.id || 'anonymous';

        const now = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse();
                    const { statusCode } = response;
                    const duration = Date.now() - now;

                    this.logger.logStructured('info', 'HTTP Request', {
                        context: 'HTTP',
                        method,
                        url,
                        statusCode,
                        duration: `${duration}ms`,
                        userId,
                        ip,
                        userAgent,
                    });
                },
                error: (error) => {
                    const duration = Date.now() - now;

                    this.logger.logStructured('error', 'HTTP Request Failed', {
                        context: 'HTTP',
                        method,
                        url,
                        duration: `${duration}ms`,
                        userId,
                        ip,
                        error: error.message,
                        stack: error.stack,
                    });
                },
            }),
        );
    }
}
