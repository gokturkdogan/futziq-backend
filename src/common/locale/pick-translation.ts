import { DEFAULT_LOCALE } from './locale.constants';

export interface TranslationRow {
  locale: string;
  title: string;
  description: string | null;
}

export interface PickedTranslation {
  title: string;
  description: string | null;
  fallbackUsed: boolean;
}

export function pickTranslation(
  translations: TranslationRow[],
  locale: string,
  legacy?: { title: string; description: string | null },
): PickedTranslation {
  const requested = translations.find((row) => row.locale === locale);
  if (requested) {
    return {
      title: requested.title,
      description: requested.description,
      fallbackUsed: false,
    };
  }

  const fallback = translations.find((row) => row.locale === DEFAULT_LOCALE);
  if (fallback) {
    return {
      title: fallback.title,
      description: fallback.description,
      fallbackUsed: true,
    };
  }

  if (legacy) {
    return {
      title: legacy.title,
      description: legacy.description,
      fallbackUsed: true,
    };
  }

  return {
    title: 'Unknown',
    description: null,
    fallbackUsed: true,
  };
}
