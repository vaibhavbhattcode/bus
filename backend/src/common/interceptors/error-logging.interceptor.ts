import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ErrorLoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method, url } = req;

        return next.handle().pipe(
            catchError((error) => {
                this.logger.error(
                    `[${method} ${url}] ${error?.message ?? 'Unknown error'}`,
                    error?.stack,
                );
                return throwError(() => error);
            }),
        );
    }
}
