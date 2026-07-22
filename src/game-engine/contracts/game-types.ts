export enum GameFamily {
  TARGET_HUNT = 'TARGET_HUNT',
  DRAFT = 'DRAFT',
  HIGHER_OR_LOWER = 'HIGHER_OR_LOWER',
  RANKING = 'RANKING',
  FIND_PLAYER = 'FIND_PLAYER',
  FIND_TEAM = 'FIND_TEAM',
  FIND_CAREER_PATH = 'FIND_CAREER_PATH',
}

export enum MetricCode {
  CAREER_GOALS = 'CAREER_GOALS',
  CAREER_ASSISTS = 'CAREER_ASSISTS',
  CAREER_YELLOW_CARDS = 'CAREER_YELLOW_CARDS',
  CAREER_RED_CARDS = 'CAREER_RED_CARDS',
  CAREER_APPEARANCES = 'CAREER_APPEARANCES',
  CAREER_MINUTES = 'CAREER_MINUTES',
  NATIONAL_TEAM_GOALS = 'NATIONAL_TEAM_GOALS',
  NATIONAL_TEAM_ASSISTS = 'NATIONAL_TEAM_ASSISTS',
  NATIONAL_TEAM_APPEARANCES = 'NATIONAL_TEAM_APPEARANCES',
  NATIONAL_TEAM_MINUTES = 'NATIONAL_TEAM_MINUTES',
  NATIONAL_TEAM_YELLOW_CARDS = 'NATIONAL_TEAM_YELLOW_CARDS',
  NATIONAL_TEAM_RED_CARDS = 'NATIONAL_TEAM_RED_CARDS',
  CLUB_GOALS = 'CLUB_GOALS',
  CLUB_ASSISTS = 'CLUB_ASSISTS',
  CLUB_APPEARANCES = 'CLUB_APPEARANCES',
  CLUB_MINUTES = 'CLUB_MINUTES',
  CLUB_YELLOW_CARDS = 'CLUB_YELLOW_CARDS',
  CLUB_RED_CARDS = 'CLUB_RED_CARDS',
  WORLD_CUP_GOALS = 'WORLD_CUP_GOALS',
  WORLD_CUP_ASSISTS = 'WORLD_CUP_ASSISTS',
  WORLD_CUP_APPEARANCES = 'WORLD_CUP_APPEARANCES',
  WORLD_CUP_MINUTES = 'WORLD_CUP_MINUTES',
  WORLD_CUP_YELLOW_CARDS = 'WORLD_CUP_YELLOW_CARDS',
  WORLD_CUP_RED_CARDS = 'WORLD_CUP_RED_CARDS',
  CHAMPIONS_LEAGUE_GOALS = 'CHAMPIONS_LEAGUE_GOALS',
  CHAMPIONS_LEAGUE_ASSISTS = 'CHAMPIONS_LEAGUE_ASSISTS',
  CHAMPIONS_LEAGUE_APPEARANCES = 'CHAMPIONS_LEAGUE_APPEARANCES',
  CHAMPIONS_LEAGUE_MINUTES = 'CHAMPIONS_LEAGUE_MINUTES',
  CHAMPIONS_LEAGUE_YELLOW_CARDS = 'CHAMPIONS_LEAGUE_YELLOW_CARDS',
  CHAMPIONS_LEAGUE_RED_CARDS = 'CHAMPIONS_LEAGUE_RED_CARDS',
  HEIGHT_CM = 'HEIGHT_CM',
  TROPHY_COUNT = 'TROPHY_COUNT',
  PEAK_MARKET_VALUE = 'PEAK_MARKET_VALUE',
}

export enum ScopeCode {
  GLOBAL_FREE = 'GLOBAL_FREE',
  EUROPEAN_PLAYERS = 'EUROPEAN_PLAYERS',
  ACTIVE_PLAYERS = 'ACTIVE_PLAYERS',
  RETIRED_PLAYERS = 'RETIRED_PLAYERS',
  RANDOM_CLUB = 'RANDOM_CLUB',
  CLUB_ALL_TIME = 'CLUB_ALL_TIME',
  NATIONAL_TEAM_ALL_TIME = 'NATIONAL_TEAM_ALL_TIME',
  LEAGUE = 'LEAGUE',
  TOURNAMENT = 'TOURNAMENT',
  CUSTOM_FILTER = 'CUSTOM_FILTER',
}

export enum AggregationType {
  SUM = 'SUM',
  AVG = 'AVG',
  MAX = 'MAX',
  MIN = 'MIN',
}

export enum ComparisonType {
  CLOSEST = 'CLOSEST',
  CLOSEST_WITHOUT_EXCEEDING = 'CLOSEST_WITHOUT_EXCEEDING',
  EXACT = 'EXACT',
  HIGHEST = 'HIGHEST',
  LOWEST = 'LOWEST',
}

export enum ObjectiveType {
  MAX = 'MAX',
  MIN = 'MIN',
}

export enum RevealPolicy {
  IMMEDIATE = 'IMMEDIATE',
  ROUND_END = 'ROUND_END',
  GAME_END = 'GAME_END',
  RANGE_ONLY = 'RANGE_ONLY',
  HIDDEN = 'HIDDEN',
}

export enum GameActionType {
  SELECT_PLAYER = 'SELECT_PLAYER',
}

export enum GameEventType {
  SESSION_STARTED = 'SESSION_STARTED',
  PLAYER_SELECTED = 'PLAYER_SELECTED',
  GAME_COMPLETED = 'GAME_COMPLETED',
}

export enum TargetGeneratorStrategy {
  DATA_DISTRIBUTION = 'DATA_DISTRIBUTION',
  RANDOM_RANGE = 'RANDOM_RANGE',
  FIXED = 'FIXED',
}

export enum DuplicatePolicy {
  REJECT_SAME_PARTICIPANT = 'REJECT_SAME_PARTICIPANT',
  REJECT_ANY_PARTICIPANT = 'REJECT_ANY_PARTICIPANT',
}

export enum ActiveStatusFilter {
  ANY = 'ANY',
  ACTIVE_ONLY = 'ACTIVE_ONLY',
  RETIRED_ONLY = 'RETIRED_ONLY',
}

export enum PositionGroup {
  GK = 'GK',
  LB = 'LB',
  LWB = 'LWB',
  CB = 'CB',
  RB = 'RB',
  RWB = 'RWB',
  DM = 'DM',
  CM = 'CM',
  AM = 'AM',
  LM = 'LM',
  LW = 'LW',
  RM = 'RM',
  RW = 'RW',
  CF = 'CF',
  ST = 'ST',
}

export enum PositionEligibilityPolicy {
  PRIMARY_ONLY = 'PRIMARY_ONLY',
  PRIMARY_AND_SECONDARY = 'PRIMARY_AND_SECONDARY',
  POSITION_GROUP = 'POSITION_GROUP',
  FREE_POSITION = 'FREE_POSITION',
}

export type DraftLineCode = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface LineupSlotDefinition {
  code: string;
  displayName: string;
  acceptedPositionGroups: PositionGroup[];
  /** UI grouping line for draft formations (GK / DEF / MID / ATT). */
  line?: DraftLineCode;
}

export interface LineupTemplate {
  code: string;
  name: string;
  slots: LineupSlotDefinition[];
}

export interface TargetConfig {
  strategy: TargetGeneratorStrategy;
  minimum?: number;
  maximum?: number;
  selectionCount: number;
  fixedValue?: number;
}

export interface PerformanceRatingThresholds {
  perfectMaxPercentDiff: number;
  excellentMaxPercentDiff: number;
  goodMaxPercentDiff: number;
  averageMaxPercentDiff: number;
}

export interface GameDefinitionConfig {
  family: GameFamily;
  metric: MetricCode;
  scope: ScopeCode;
  scopeParams?: Record<string, unknown>;
  selectionCount: number;
  aggregation: AggregationType;
  comparison: ComparisonType;
  objective?: ObjectiveType;
  revealPolicy: RevealPolicy;
  duplicatePolicy: DuplicatePolicy;
  activeStatusFilter: ActiveStatusFilter;
  target?: TargetConfig;
  performanceRating?: PerformanceRatingThresholds;
  lineupTemplate?: LineupTemplate;
  positionEligibilityPolicy?: PositionEligibilityPolicy;
}

export const DEFAULT_PERFORMANCE_RATING: PerformanceRatingThresholds = {
  perfectMaxPercentDiff: 2,
  excellentMaxPercentDiff: 5,
  goodMaxPercentDiff: 10,
  averageMaxPercentDiff: 20,
};

export const DEFAULT_TARGET_HUNT_CONFIG: GameDefinitionConfig = {
  family: GameFamily.TARGET_HUNT,
  metric: MetricCode.CAREER_GOALS,
  scope: ScopeCode.GLOBAL_FREE,
  selectionCount: 5,
  aggregation: AggregationType.SUM,
  comparison: ComparisonType.CLOSEST,
  revealPolicy: RevealPolicy.IMMEDIATE,
  duplicatePolicy: DuplicatePolicy.REJECT_SAME_PARTICIPANT,
  activeStatusFilter: ActiveStatusFilter.ANY,
  target: {
    strategy: TargetGeneratorStrategy.DATA_DISTRIBUTION,
    minimum: 250,
    maximum: 1200,
    selectionCount: 5,
  },
  performanceRating: DEFAULT_PERFORMANCE_RATING,
};

export const FORMATION_1_2_2_1: LineupTemplate = {
  code: 'FORMATION_1_2_2_1',
  name: '1-2-2-1',
  slots: [
    {
      code: 'GK',
      displayName: 'Goalkeeper',
      line: 'GK',
      acceptedPositionGroups: [PositionGroup.GK],
    },
    {
      code: 'DEF1',
      displayName: 'Defender',
      line: 'DEF',
      acceptedPositionGroups: [PositionGroup.CB, PositionGroup.LB, PositionGroup.RB],
    },
    {
      code: 'DEF2',
      displayName: 'Defender',
      line: 'DEF',
      acceptedPositionGroups: [PositionGroup.CB, PositionGroup.LB, PositionGroup.RB],
    },
    {
      code: 'MID1',
      displayName: 'Midfield',
      line: 'MID',
      acceptedPositionGroups: [PositionGroup.CM, PositionGroup.DM, PositionGroup.AM],
    },
    {
      code: 'MID2',
      displayName: 'Midfield',
      line: 'MID',
      acceptedPositionGroups: [PositionGroup.CM, PositionGroup.DM, PositionGroup.AM],
    },
    {
      code: 'ATT',
      displayName: 'Attack',
      line: 'ATT',
      acceptedPositionGroups: [
        PositionGroup.ST,
        PositionGroup.CF,
        PositionGroup.LW,
        PositionGroup.RW,
      ],
    },
  ],
};

export const FORMATION_4_2_3_1: LineupTemplate = {
  code: 'FORMATION_4_2_3_1',
  name: '4-2-3-1',
  slots: [
    { code: 'GK', displayName: 'Goalkeeper', acceptedPositionGroups: [PositionGroup.GK] },
    {
      code: 'LB',
      displayName: 'Left Back',
      acceptedPositionGroups: [PositionGroup.LB, PositionGroup.LWB],
    },
    { code: 'LCB', displayName: 'Left Centre Back', acceptedPositionGroups: [PositionGroup.CB] },
    {
      code: 'RCB',
      displayName: 'Right Centre Back',
      acceptedPositionGroups: [PositionGroup.CB],
    },
    {
      code: 'RB',
      displayName: 'Right Back',
      acceptedPositionGroups: [PositionGroup.RB, PositionGroup.RWB],
    },
    {
      code: 'LCM',
      displayName: 'Left Central Midfielder',
      acceptedPositionGroups: [PositionGroup.CM, PositionGroup.DM],
    },
    {
      code: 'RCM',
      displayName: 'Right Central Midfielder',
      acceptedPositionGroups: [PositionGroup.CM, PositionGroup.DM],
    },
    {
      code: 'LW',
      displayName: 'Left Winger',
      acceptedPositionGroups: [PositionGroup.LW, PositionGroup.LM],
    },
    {
      code: 'CAM',
      displayName: 'Attacking Midfielder',
      acceptedPositionGroups: [PositionGroup.AM],
    },
    {
      code: 'RW',
      displayName: 'Right Winger',
      acceptedPositionGroups: [PositionGroup.RW, PositionGroup.RM],
    },
    {
      code: 'ST',
      displayName: 'Striker',
      acceptedPositionGroups: [PositionGroup.ST, PositionGroup.CF],
    },
  ],
};

export const DEFAULT_DRAFT_CONFIG: GameDefinitionConfig = {
  family: GameFamily.DRAFT,
  metric: MetricCode.HEIGHT_CM,
  scope: ScopeCode.GLOBAL_FREE,
  selectionCount: 6,
  aggregation: AggregationType.SUM,
  comparison: ComparisonType.HIGHEST,
  objective: ObjectiveType.MAX,
  revealPolicy: RevealPolicy.IMMEDIATE,
  duplicatePolicy: DuplicatePolicy.REJECT_SAME_PARTICIPANT,
  activeStatusFilter: ActiveStatusFilter.ANY,
  lineupTemplate: FORMATION_1_2_2_1,
  positionEligibilityPolicy: PositionEligibilityPolicy.PRIMARY_AND_SECONDARY,
};
