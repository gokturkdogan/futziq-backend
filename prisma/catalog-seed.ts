import {
  DEFAULT_DRAFT_CONFIG,
  DEFAULT_PERFORMANCE_RATING,
  DEFAULT_TARGET_HUNT_CONFIG,
  ComparisonType,
  GameDefinitionConfig,
  GameFamily,
  MetricCode,
  ObjectiveType,
  TargetGeneratorStrategy,
} from '../src/game-engine/contracts/game-types';
import type { SupportedLocale } from '../src/common/locale/locale.constants';
import { RANDOM_SCOPE_CODE } from '../src/game-catalog/domain/catalog.constants';

type LocalizedText = Record<SupportedLocale, { title: string; description: string }>;

export const GAME_FAMILIES = [
  {
    code: GameFamily.TARGET_HUNT,
    imageUrl: '/images/families/target-hunt.png',
    sortOrder: 1,
    translations: {
      tr: {
        title: 'Hedef Avı',
        description: 'Hedef değere en yakın toplamı oluşturmak için oyuncu seç.',
      },
      en: {
        title: 'Target Hunt',
        description: 'Pick players to build a total closest to the target.',
      },
    },
  },
  {
    code: GameFamily.DRAFT,
    imageUrl: '/images/families/draft.png',
    sortOrder: 2,
    translations: {
      tr: {
        title: 'Kadro Kur',
        description: 'Formasyona uygun slotlara oyuncu yerleştirerek kadronu oluştur.',
      },
      en: {
        title: 'Squad Builder',
        description: 'Build your squad by placing players into formation slots.',
      },
    },
  },
] as const;

export const PLAYABLE_GAME_SCOPES = [
  {
    code: 'CAREER',
    sortOrder: 1,
    translations: {
      tr: { title: 'Kariyer', description: 'Tüm kariyer istatistikleri.' },
      en: { title: 'Career', description: 'All career statistics.' },
    },
  },
  {
    code: 'CLUB',
    sortOrder: 2,
    translations: {
      tr: { title: 'Kulüp', description: 'Kulüp kariyer istatistikleri.' },
      en: { title: 'Club', description: 'Club career statistics.' },
    },
  },
  {
    code: 'NATIONAL_TEAM',
    sortOrder: 3,
    translations: {
      tr: { title: 'Milli Takım', description: 'Milli takım kariyer istatistikleri.' },
      en: { title: 'National Team', description: 'National team career statistics.' },
    },
  },
  {
    code: 'WORLD_CUP',
    sortOrder: 4,
    translations: {
      tr: { title: 'Dünya Kupası', description: 'Dünya Kupası istatistikleri.' },
      en: { title: 'World Cup', description: 'World Cup statistics.' },
    },
  },
  {
    code: 'CHAMPIONS_LEAGUE',
    sortOrder: 5,
    translations: {
      tr: { title: 'Şampiyonlar Ligi', description: 'UEFA Şampiyonlar Ligi istatistikleri.' },
      en: { title: 'Champions League', description: 'UEFA Champions League statistics.' },
    },
  },
] as const;

export const RANDOM_GAME_SCOPE = {
  code: RANDOM_SCOPE_CODE,
  sortOrder: 6,
  imageUrl: null,
  translations: {
    tr: {
      title: 'Rastgele',
      description: 'Oyun başladığında rastgele bir kapsam seçilir.',
    },
    en: {
      title: 'Random',
      description: 'A random scope is chosen when the game starts.',
    },
  },
} as const;

export const GAME_SCOPES = [...PLAYABLE_GAME_SCOPES, RANDOM_GAME_SCOPE] as const;

export const TARGET_HUNT_GAMES = [
  {
    code: 'GOALS',
    sortOrder: 1,
    imageUrl: '/images/games/goals.png',
    bannerImageUrl: '/images/games/banners/goals.png',
    translations: {
      tr: { title: 'Gol', description: 'Gol hedef avı modu.' },
      en: { title: 'Goals', description: 'Goals target hunt mode.' },
    },
  },
  {
    code: 'ASSISTS',
    sortOrder: 2,
    imageUrl: '/images/games/assists.png',
    bannerImageUrl: '/images/games/banners/assists.png',
    translations: {
      tr: { title: 'Asist', description: 'Asist hedef avı modu.' },
      en: { title: 'Assists', description: 'Assists target hunt mode.' },
    },
  },
  {
    code: 'APPEARANCES',
    sortOrder: 3,
    imageUrl: '/images/games/appearances.png',
    bannerImageUrl: '/images/games/banners/appearances.png',
    translations: {
      tr: { title: 'Oynanan Maç', description: 'Oynanan maç hedef avı modu.' },
      en: { title: 'Appearances', description: 'Appearances target hunt mode.' },
    },
  },
  {
    code: 'MINUTES',
    sortOrder: 4,
    imageUrl: '/images/games/minutes.png',
    bannerImageUrl: '/images/games/banners/minutes.png',
    translations: {
      tr: { title: 'Oynanan Dakika', description: 'Oynanan dakika hedef avı modu.' },
      en: { title: 'Minutes Played', description: 'Minutes played target hunt mode.' },
    },
  },
  {
    code: 'YELLOW_CARDS',
    sortOrder: 5,
    imageUrl: '/images/games/yellow-cards.png',
    bannerImageUrl: '/images/games/banners/yellow-cards.png',
    translations: {
      tr: { title: 'Sarı Kart', description: 'Sarı kart hedef avı modu.' },
      en: { title: 'Yellow Cards', description: 'Yellow cards target hunt mode.' },
    },
  },
  {
    code: 'RED_CARDS',
    sortOrder: 6,
    imageUrl: '/images/games/red-cards.png',
    bannerImageUrl: '/images/games/banners/red-cards.png',
    translations: {
      tr: { title: 'Kırmızı Kart', description: 'Kırmızı kart hedef avı modu.' },
      en: { title: 'Red Cards', description: 'Red cards target hunt mode.' },
    },
  },
] as const;

export type TargetHuntGameCode = (typeof TARGET_HUNT_GAMES)[number]['code'];
export type PlayableGameScopeCode = (typeof PLAYABLE_GAME_SCOPES)[number]['code'];
export type GameScopeCode = (typeof GAME_SCOPES)[number]['code'];

const ENGINE_METRIC: Record<TargetHuntGameCode, Record<PlayableGameScopeCode, MetricCode>> = {
  GOALS: {
    CAREER: MetricCode.CAREER_GOALS,
    CLUB: MetricCode.CLUB_GOALS,
    NATIONAL_TEAM: MetricCode.NATIONAL_TEAM_GOALS,
    WORLD_CUP: MetricCode.WORLD_CUP_GOALS,
    CHAMPIONS_LEAGUE: MetricCode.CHAMPIONS_LEAGUE_GOALS,
  },
  ASSISTS: {
    CAREER: MetricCode.CAREER_ASSISTS,
    CLUB: MetricCode.CLUB_ASSISTS,
    NATIONAL_TEAM: MetricCode.NATIONAL_TEAM_ASSISTS,
    WORLD_CUP: MetricCode.WORLD_CUP_ASSISTS,
    CHAMPIONS_LEAGUE: MetricCode.CHAMPIONS_LEAGUE_ASSISTS,
  },
  APPEARANCES: {
    CAREER: MetricCode.CAREER_APPEARANCES,
    CLUB: MetricCode.CLUB_APPEARANCES,
    NATIONAL_TEAM: MetricCode.NATIONAL_TEAM_APPEARANCES,
    WORLD_CUP: MetricCode.WORLD_CUP_APPEARANCES,
    CHAMPIONS_LEAGUE: MetricCode.CHAMPIONS_LEAGUE_APPEARANCES,
  },
  MINUTES: {
    CAREER: MetricCode.CAREER_MINUTES,
    CLUB: MetricCode.CLUB_MINUTES,
    NATIONAL_TEAM: MetricCode.NATIONAL_TEAM_MINUTES,
    WORLD_CUP: MetricCode.WORLD_CUP_MINUTES,
    CHAMPIONS_LEAGUE: MetricCode.CHAMPIONS_LEAGUE_MINUTES,
  },
  YELLOW_CARDS: {
    CAREER: MetricCode.CAREER_YELLOW_CARDS,
    CLUB: MetricCode.CLUB_YELLOW_CARDS,
    NATIONAL_TEAM: MetricCode.NATIONAL_TEAM_YELLOW_CARDS,
    WORLD_CUP: MetricCode.WORLD_CUP_YELLOW_CARDS,
    CHAMPIONS_LEAGUE: MetricCode.CHAMPIONS_LEAGUE_YELLOW_CARDS,
  },
  RED_CARDS: {
    CAREER: MetricCode.CAREER_RED_CARDS,
    CLUB: MetricCode.CLUB_RED_CARDS,
    NATIONAL_TEAM: MetricCode.NATIONAL_TEAM_RED_CARDS,
    WORLD_CUP: MetricCode.WORLD_CUP_RED_CARDS,
    CHAMPIONS_LEAGUE: MetricCode.CHAMPIONS_LEAGUE_RED_CARDS,
  },
};

const BASE_TARGET_RANGES: Record<TargetHuntGameCode, { minimum: number; maximum: number }> = {
  GOALS: { minimum: 250, maximum: 1200 },
  ASSISTS: { minimum: 100, maximum: 600 },
  APPEARANCES: { minimum: 500, maximum: 3500 },
  MINUTES: { minimum: 20000, maximum: 150000 },
  YELLOW_CARDS: { minimum: 100, maximum: 600 },
  RED_CARDS: { minimum: 5, maximum: 60 },
};

const SCOPE_SCALE: Record<PlayableGameScopeCode, number> = {
  CAREER: 1,
  CLUB: 0.8,
  NATIONAL_TEAM: 0.2,
  WORLD_CUP: 0.05,
  CHAMPIONS_LEAGUE: 0.15,
};

function buildTargetHuntConfig(
  gameCode: TargetHuntGameCode,
  scopeCode: PlayableGameScopeCode,
): GameDefinitionConfig {
  const base = BASE_TARGET_RANGES[gameCode];
  const scale = SCOPE_SCALE[scopeCode];

  return {
    ...DEFAULT_TARGET_HUNT_CONFIG,
    metric: ENGINE_METRIC[gameCode][scopeCode],
    target: {
      strategy: TargetGeneratorStrategy.DATA_DISTRIBUTION,
      minimum: Math.max(1, Math.round(base.minimum * scale)),
      maximum: Math.max(2, Math.round(base.maximum * scale)),
      selectionCount: 5,
    },
    performanceRating: {
      ...DEFAULT_PERFORMANCE_RATING,
    },
  };
}

export function buildTargetHuntScopeRuleConfig(
  gameCode: TargetHuntGameCode,
  scopeCode: PlayableGameScopeCode,
): GameDefinitionConfig {
  return buildTargetHuntConfig(gameCode, scopeCode);
}

export function buildDraftGameConfig(objective: ObjectiveType): GameDefinitionConfig {
  return {
    ...DEFAULT_DRAFT_CONFIG,
    metric: MetricCode.HEIGHT_CM,
    objective,
    comparison: objective === ObjectiveType.MIN ? ComparisonType.LOWEST : ComparisonType.HIGHEST,
  };
}

export const DRAFT_GAMES = [
  {
    code: 'TALLEST_XI',
    objective: ObjectiveType.MAX,
    imageUrl: '/images/games/tallest-xi.png',
    bannerImageUrl: '/images/games/banners/tallest-xi.png',
    translations: {
      tr: {
        title: 'En Uzun 6',
        description: '1 kaleci, 2 defans, 2 orta saha, 1 forvet ile en uzun kadroyu kur.',
      },
      en: {
        title: 'Tallest Six',
        description: 'Build the tallest squad with 1 GK, 2 DEF, 2 MID, and 1 ATT.',
      },
    },
  },
  {
    code: 'SHORTEST_XI',
    objective: ObjectiveType.MIN,
    imageUrl: '/images/games/shortest-xi.png',
    bannerImageUrl: '/images/games/banners/shortest-xi.png',
    translations: {
      tr: {
        title: 'En Kısa 6',
        description: '1 kaleci, 2 defans, 2 orta saha, 1 forvet ile en kısa kadroyu kur.',
      },
      en: {
        title: 'Shortest Six',
        description: 'Build the shortest squad with 1 GK, 2 DEF, 2 MID, and 1 ATT.',
      },
    },
  },
] as const;

export function getDefaultLocaleText(translations: LocalizedText, locale: SupportedLocale = 'tr') {
  return translations[locale];
}
