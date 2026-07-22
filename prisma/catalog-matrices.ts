import {
  DEFAULT_DRAFT_CONFIG,
  GameDefinitionConfig,
  GameFamily,
  MetricCode,
  ObjectiveType,
} from '../src/game-engine/contracts/game-types';
import {
  buildTargetHuntScopeRuleConfig,
  PLAYABLE_GAME_SCOPES,
  TARGET_HUNT_GAMES,
  type PlayableGameScopeCode,
  type TargetHuntGameCode,
} from './catalog-seed';

export const TARGET_HUNT_MATRIX = {
  family: GameFamily.TARGET_HUNT,
  games: TARGET_HUNT_GAMES.map((game) => game.code) as TargetHuntGameCode[],
  scopes: PLAYABLE_GAME_SCOPES.map((scope) => scope.code) as PlayableGameScopeCode[],
  buildConfig: (game: TargetHuntGameCode, scope: PlayableGameScopeCode) =>
    buildTargetHuntScopeRuleConfig(game, scope),
} as const;

export const DRAFT_MATRIX = {
  family: GameFamily.DRAFT,
  games: [
    {
      code: 'TALLEST_6',
      objective: ObjectiveType.MAX,
      metric: MetricCode.HEIGHT_CM,
      translations: {
        tr: { title: 'En Uzun 6', description: 'En uzun 6 oyuncudan kadro kur.' },
        en: { title: 'Tallest 6', description: 'Build a squad from the 6 tallest players.' },
      },
    },
    {
      code: 'SHORTEST_6',
      objective: ObjectiveType.MIN,
      metric: MetricCode.HEIGHT_CM,
      translations: {
        tr: { title: 'En Kısa 6', description: 'En kısa 6 oyuncudan kadro kur.' },
        en: { title: 'Shortest 6', description: 'Build a squad from the 6 shortest players.' },
      },
    },
  ],
  buildConfig: (metric: MetricCode, objective: ObjectiveType): GameDefinitionConfig => ({
    ...DEFAULT_DRAFT_CONFIG,
    metric,
    objective,
  }),
} as const;
