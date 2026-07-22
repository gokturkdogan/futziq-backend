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

export const GAME_FAMILIES = [
  {
    code: GameFamily.TARGET_HUNT,
    title: 'Hedef Avı',
    description: 'Hedef değere en yakın toplamı oluşturmak için oyuncu seç.',
    imageUrl: '/images/families/target-hunt.png',
    sortOrder: 1,
  },
  {
    code: GameFamily.DRAFT,
    title: 'Kadro Kur',
    description: 'Formasyona uygun slotlara oyuncu yerleştirerek kadronu oluştur.',
    imageUrl: '/images/families/draft.png',
    sortOrder: 2,
  },
] as const;

export const GAME_SCOPES = [
  {
    code: 'CAREER',
    title: 'Kariyer',
    description: 'Tüm kariyer istatistikleri.',
    sortOrder: 1,
  },
  {
    code: 'CLUB',
    title: 'Kulüp',
    description: 'Kulüp kariyer istatistikleri.',
    sortOrder: 2,
  },
  {
    code: 'NATIONAL_TEAM',
    title: 'Milli Takım',
    description: 'Milli takım kariyer istatistikleri.',
    sortOrder: 3,
  },
  {
    code: 'WORLD_CUP',
    title: 'Dünya Kupası',
    description: 'Dünya Kupası istatistikleri.',
    sortOrder: 4,
  },
  {
    code: 'CHAMPIONS_LEAGUE',
    title: 'Şampiyonlar Ligi',
    description: 'UEFA Şampiyonlar Ligi istatistikleri.',
    sortOrder: 5,
  },
] as const;

export const TARGET_HUNT_GAMES = [
  { code: 'GOALS', title: 'Gol', sortOrder: 1, imageUrl: '/images/games/goals.png', bannerImageUrl: '/images/games/banners/goals.png' },
  { code: 'ASSISTS', title: 'Asist', sortOrder: 2, imageUrl: '/images/games/assists.png', bannerImageUrl: '/images/games/banners/assists.png' },
  { code: 'APPEARANCES', title: 'Oynanan Maç', sortOrder: 3, imageUrl: '/images/games/appearances.png', bannerImageUrl: '/images/games/banners/appearances.png' },
  { code: 'MINUTES', title: 'Oynanan Dakika', sortOrder: 4, imageUrl: '/images/games/minutes.png', bannerImageUrl: '/images/games/banners/minutes.png' },
  { code: 'YELLOW_CARDS', title: 'Sarı Kart', sortOrder: 5, imageUrl: '/images/games/yellow-cards.png', bannerImageUrl: '/images/games/banners/yellow-cards.png' },
  { code: 'RED_CARDS', title: 'Kırmızı Kart', sortOrder: 6, imageUrl: '/images/games/red-cards.png', bannerImageUrl: '/images/games/banners/red-cards.png' },
] as const;

export type TargetHuntGameCode = (typeof TARGET_HUNT_GAMES)[number]['code'];
export type GameScopeCode = (typeof GAME_SCOPES)[number]['code'];

const ENGINE_METRIC: Record<TargetHuntGameCode, Record<GameScopeCode, MetricCode>> = {
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

const SCOPE_SCALE: Record<GameScopeCode, number> = {
  CAREER: 1,
  CLUB: 0.8,
  NATIONAL_TEAM: 0.2,
  WORLD_CUP: 0.05,
  CHAMPIONS_LEAGUE: 0.15,
};

function buildTargetHuntConfig(
  gameCode: TargetHuntGameCode,
  scopeCode: GameScopeCode,
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
  scopeCode: GameScopeCode,
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
    title: 'En Uzun XI',
    description: '4-2-3-1 diziliminde boy toplamı en yüksek ilk 11i kur.',
    objective: ObjectiveType.MAX,
    imageUrl: '/images/games/tallest-xi.png',
    bannerImageUrl: '/images/games/banners/tallest-xi.png',
  },
  {
    code: 'SHORTEST_XI',
    title: 'En Kısa XI',
    description: '4-2-3-1 diziliminde boy toplamı en düşük ilk 11i kur.',
    objective: ObjectiveType.MIN,
    imageUrl: '/images/games/shortest-xi.png',
    bannerImageUrl: '/images/games/banners/shortest-xi.png',
  },
] as const;
