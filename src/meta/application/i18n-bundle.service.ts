import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '../../common/locale/locale.constants';
import { ErrorCode } from '../../common/errors/domain.exception';

type LocaleBundle = Record<string, string>;

const ERROR_MESSAGES: Record<SupportedLocale, LocaleBundle> = {
  tr: {
    'errors.NOT_YOUR_TURN': 'Sıra sende değil',
    'errors.PLAYER_ALREADY_SELECTED': 'Bu oyuncu zaten seçildi',
    'errors.PLAYER_NOT_ELIGIBLE': 'Oyuncu bu oyun için uygun değil',
    'errors.PLAYER_NOT_FOUND': 'Oyuncu bulunamadı',
    'errors.SELECTION_LIMIT_REACHED': 'Seçim limitine ulaşıldı',
    'errors.STATE_VERSION_CONFLICT': 'Durum sürümü uyuşmuyor, yenileyip tekrar deneyin',
    'errors.GAME_SESSION_NOT_FOUND': 'Oyun oturumu bulunamadı',
    'errors.GAME_SESSION_NOT_ACTIVE': 'Oyun oturumu aktif değil',
    'errors.RESULT_NOT_AVAILABLE': 'Sonuç henüz hazır değil',
    'errors.INVALID_GAME_ACTION': 'Geçersiz oyun aksiyonu',
    'errors.METRIC_VALUE_MISSING': 'Oyuncu metrik değeri eksik',
  },
  en: {
    'errors.NOT_YOUR_TURN': 'It is not your turn',
    'errors.PLAYER_ALREADY_SELECTED': 'Player has already been selected',
    'errors.PLAYER_NOT_ELIGIBLE': 'Player is not eligible for this game',
    'errors.PLAYER_NOT_FOUND': 'Player not found',
    'errors.SELECTION_LIMIT_REACHED': 'Selection limit reached',
    'errors.STATE_VERSION_CONFLICT': 'State version conflict, refresh and retry',
    'errors.GAME_SESSION_NOT_FOUND': 'Game session not found',
    'errors.GAME_SESSION_NOT_ACTIVE': 'Game session is not active',
    'errors.RESULT_NOT_AVAILABLE': 'Result is not available yet',
    'errors.INVALID_GAME_ACTION': 'Invalid game action',
    'errors.METRIC_VALUE_MISSING': 'Player metric value is missing',
  },
};

const ENUM_LABELS: Record<SupportedLocale, LocaleBundle> = {
  tr: {
    'enums.performance.PERFECT': 'Mükemmel',
    'enums.performance.EXCELLENT': 'Harika',
    'enums.performance.GOOD': 'İyi',
    'enums.performance.AVERAGE': 'Orta',
    'enums.performance.POOR': 'Zayıf',
    'enums.objective.MAX': 'En yüksek',
    'enums.objective.MIN': 'En düşük',
    'enums.playerMode.SINGLE': 'Tek oyuncu',
    'enums.playerMode.MULTIPLAYER': 'Çok oyunculu',
  },
  en: {
    'enums.performance.PERFECT': 'Perfect',
    'enums.performance.EXCELLENT': 'Excellent',
    'enums.performance.GOOD': 'Good',
    'enums.performance.AVERAGE': 'Average',
    'enums.performance.POOR': 'Poor',
    'enums.objective.MAX': 'Highest',
    'enums.objective.MIN': 'Lowest',
    'enums.playerMode.SINGLE': 'Single player',
    'enums.playerMode.MULTIPLAYER': 'Multiplayer',
  },
};

const SLOT_LABELS: Record<SupportedLocale, LocaleBundle> = {
  tr: {
    'slots.GK': 'Kaleci',
    'slots.DEF1': 'Defans',
    'slots.DEF2': 'Defans',
    'slots.MID1': 'Orta Saha',
    'slots.MID2': 'Orta Saha',
    'slots.ATT': 'Forvet',
  },
  en: {
    'slots.GK': 'Goalkeeper',
    'slots.DEF1': 'Defender',
    'slots.DEF2': 'Defender',
    'slots.MID1': 'Midfield',
    'slots.MID2': 'Midfield',
    'slots.ATT': 'Attack',
  },
};

@Injectable()
export class I18nBundleService {
  getBundle(locale: string) {
    const resolved = (locale in ERROR_MESSAGES ? locale : 'en') as SupportedLocale;
    return {
      errors: ERROR_MESSAGES[resolved],
      enums: ENUM_LABELS[resolved],
      slots: SLOT_LABELS[resolved],
    };
  }

  getEnums(locale: string) {
    const resolved = (locale in ENUM_LABELS ? locale : 'en') as SupportedLocale;
    return ENUM_LABELS[resolved];
  }

  getErrorMessages(locale: string) {
    const resolved = (locale in ERROR_MESSAGES ? locale : 'en') as SupportedLocale;
    return ERROR_MESSAGES[resolved];
  }

  getErrorMessage(locale: string, code: ErrorCode): string | undefined {
    const resolved = (locale in ERROR_MESSAGES ? locale : 'en') as SupportedLocale;
    return ERROR_MESSAGES[resolved][`errors.${code}`];
  }
}
