import { DEFAULT_LOCALE, isSupportedLocale } from './locale.constants';

export function parseAcceptLanguage(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const parts = header.split(',').map((segment) => segment.trim().split(';')[0]?.toLowerCase());

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (isSupportedLocale(part)) {
      return part;
    }

    const primary = part.split('-')[0];
    if (primary && isSupportedLocale(primary)) {
      return primary;
    }
  }

  return null;
}

export function resolveLocale(input: {
  queryLocale?: string | string[];
  acceptLanguage?: string;
}): string {
  const rawQuery = Array.isArray(input.queryLocale) ? input.queryLocale[0] : input.queryLocale;
  if (rawQuery && isSupportedLocale(rawQuery)) {
    return rawQuery;
  }

  const fromHeader = parseAcceptLanguage(input.acceptLanguage);
  if (fromHeader) {
    return fromHeader;
  }

  return DEFAULT_LOCALE;
}
