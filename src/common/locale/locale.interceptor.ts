import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { resolveLocale } from './resolve-locale';

export type LocaleRequest = Request & { locale: string };

@Injectable()
export class LocaleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<LocaleRequest>();
    const queryLocale = request.query?.locale;
    let normalizedQuery: string | string[] | undefined;
    if (typeof queryLocale === 'string') {
      normalizedQuery = queryLocale;
    } else if (Array.isArray(queryLocale)) {
      normalizedQuery = queryLocale.filter((value): value is string => typeof value === 'string');
    }

    request.locale = resolveLocale({
      queryLocale: normalizedQuery,
      acceptLanguage: request.headers['accept-language'],
    });

    return next.handle();
  }
}
