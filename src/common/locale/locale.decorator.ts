import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DEFAULT_LOCALE } from './locale.constants';
import { LocaleRequest } from './locale.interceptor';

export const Locale = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<LocaleRequest>();
  return request.locale ?? DEFAULT_LOCALE;
});
