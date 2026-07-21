import { MetricCode } from '../contracts/game-types';
import { PlayerRecord } from '../../football-data/domain/football-data.repository';

export interface MetricFieldDefinition {
  recordField: keyof PlayerRecord;
  prismaField: string;
  sqlColumn: string;
  minValue?: number;
}

export const METRIC_FIELD_MAP: Record<string, MetricFieldDefinition> = {
  [MetricCode.CAREER_GOALS]: {
    recordField: 'totalGoals',
    prismaField: 'totalGoals',
    sqlColumn: 'total_goals',
  },
  [MetricCode.CAREER_ASSISTS]: {
    recordField: 'totalAssists',
    prismaField: 'totalAssists',
    sqlColumn: 'total_assists',
  },
  [MetricCode.CAREER_YELLOW_CARDS]: {
    recordField: 'totalYellowCards',
    prismaField: 'totalYellowCards',
    sqlColumn: 'total_yellow_cards',
  },
  [MetricCode.CAREER_RED_CARDS]: {
    recordField: 'totalRedCards',
    prismaField: 'totalRedCards',
    sqlColumn: 'total_red_cards',
  },
  [MetricCode.CAREER_APPEARANCES]: {
    recordField: 'totalAppearances',
    prismaField: 'totalAppearances',
    sqlColumn: 'total_appearances',
  },
  [MetricCode.CAREER_MINUTES]: {
    recordField: 'totalMinutes',
    prismaField: 'totalMinutes',
    sqlColumn: 'total_minutes',
  },
  [MetricCode.NATIONAL_TEAM_GOALS]: {
    recordField: 'internationalGoals',
    prismaField: 'internationalGoals',
    sqlColumn: 'international_goals',
  },
  [MetricCode.NATIONAL_TEAM_ASSISTS]: {
    recordField: 'internationalAssists',
    prismaField: 'internationalAssists',
    sqlColumn: 'international_assists',
  },
  [MetricCode.NATIONAL_TEAM_APPEARANCES]: {
    recordField: 'internationalAppearances',
    prismaField: 'internationalAppearances',
    sqlColumn: 'international_appearances',
  },
  [MetricCode.NATIONAL_TEAM_MINUTES]: {
    recordField: 'internationalMinutes',
    prismaField: 'internationalMinutes',
    sqlColumn: 'international_minutes',
  },
  [MetricCode.NATIONAL_TEAM_YELLOW_CARDS]: {
    recordField: 'internationalYellowCards',
    prismaField: 'internationalYellowCards',
    sqlColumn: 'international_yellow_cards',
  },
  [MetricCode.NATIONAL_TEAM_RED_CARDS]: {
    recordField: 'internationalRedCards',
    prismaField: 'internationalRedCards',
    sqlColumn: 'international_red_cards',
  },
  [MetricCode.CLUB_GOALS]: {
    recordField: 'clubGoals',
    prismaField: 'clubGoals',
    sqlColumn: 'club_goals',
  },
  [MetricCode.CLUB_ASSISTS]: {
    recordField: 'clubAssists',
    prismaField: 'clubAssists',
    sqlColumn: 'club_assists',
  },
  [MetricCode.CLUB_APPEARANCES]: {
    recordField: 'clubAppearances',
    prismaField: 'clubAppearances',
    sqlColumn: 'club_appearances',
  },
  [MetricCode.CLUB_MINUTES]: {
    recordField: 'clubMinutes',
    prismaField: 'clubMinutes',
    sqlColumn: 'club_minutes',
  },
  [MetricCode.CLUB_YELLOW_CARDS]: {
    recordField: 'clubYellowCards',
    prismaField: 'clubYellowCards',
    sqlColumn: 'club_yellow_cards',
  },
  [MetricCode.CLUB_RED_CARDS]: {
    recordField: 'clubRedCards',
    prismaField: 'clubRedCards',
    sqlColumn: 'club_red_cards',
  },
  [MetricCode.WORLD_CUP_GOALS]: {
    recordField: 'worldCupGoals',
    prismaField: 'worldCupGoals',
    sqlColumn: 'world_cup_goals',
  },
  [MetricCode.WORLD_CUP_ASSISTS]: {
    recordField: 'worldCupAssists',
    prismaField: 'worldCupAssists',
    sqlColumn: 'world_cup_assists',
  },
  [MetricCode.WORLD_CUP_APPEARANCES]: {
    recordField: 'worldCupAppearances',
    prismaField: 'worldCupAppearances',
    sqlColumn: 'world_cup_appearances',
  },
  [MetricCode.WORLD_CUP_MINUTES]: {
    recordField: 'worldCupMinutes',
    prismaField: 'worldCupMinutes',
    sqlColumn: 'world_cup_minutes',
  },
  [MetricCode.WORLD_CUP_YELLOW_CARDS]: {
    recordField: 'worldCupYellowCards',
    prismaField: 'worldCupYellowCards',
    sqlColumn: 'world_cup_yellow_cards',
  },
  [MetricCode.WORLD_CUP_RED_CARDS]: {
    recordField: 'worldCupRedCards',
    prismaField: 'worldCupRedCards',
    sqlColumn: 'world_cup_red_cards',
  },
  [MetricCode.CHAMPIONS_LEAGUE_GOALS]: {
    recordField: 'championsLeagueGoals',
    prismaField: 'championsLeagueGoals',
    sqlColumn: 'champions_league_goals',
  },
  [MetricCode.CHAMPIONS_LEAGUE_ASSISTS]: {
    recordField: 'championsLeagueAssists',
    prismaField: 'championsLeagueAssists',
    sqlColumn: 'champions_league_assists',
  },
  [MetricCode.CHAMPIONS_LEAGUE_APPEARANCES]: {
    recordField: 'championsLeagueAppearances',
    prismaField: 'championsLeagueAppearances',
    sqlColumn: 'champions_league_appearances',
  },
  [MetricCode.CHAMPIONS_LEAGUE_MINUTES]: {
    recordField: 'championsLeagueMinutes',
    prismaField: 'championsLeagueMinutes',
    sqlColumn: 'champions_league_minutes',
  },
  [MetricCode.CHAMPIONS_LEAGUE_YELLOW_CARDS]: {
    recordField: 'championsLeagueYellowCards',
    prismaField: 'championsLeagueYellowCards',
    sqlColumn: 'champions_league_yellow_cards',
  },
  [MetricCode.CHAMPIONS_LEAGUE_RED_CARDS]: {
    recordField: 'championsLeagueRedCards',
    prismaField: 'championsLeagueRedCards',
    sqlColumn: 'champions_league_red_cards',
  },
  [MetricCode.HEIGHT_CM]: {
    recordField: 'heightCm',
    prismaField: 'heightCm',
    sqlColumn: 'height_cm',
    minValue: 150,
  },
};

export function resolveMetricField(metricCode: string): MetricFieldDefinition {
  return METRIC_FIELD_MAP[metricCode] ?? METRIC_FIELD_MAP[MetricCode.CAREER_GOALS];
}
