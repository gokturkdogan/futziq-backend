export interface PlayerRecord {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  primaryPosition: string | null;
  subPosition: string | null;
  isActive: boolean | null;
  heightCm: number | null;
  totalGoals: number | null;
  totalAssists: number | null;
  totalYellowCards: number | null;
  totalRedCards: number | null;
  totalAppearances: number | null;
  totalMinutes: number | null;
  internationalGoals: number | null;
  internationalAssists: number | null;
  internationalAppearances: number | null;
  internationalMinutes: number | null;
  internationalYellowCards: number | null;
  internationalRedCards: number | null;
  clubGoals: number | null;
  clubAssists: number | null;
  clubAppearances: number | null;
  clubMinutes: number | null;
  clubYellowCards: number | null;
  clubRedCards: number | null;
  worldCupGoals: number | null;
  worldCupAssists: number | null;
  worldCupAppearances: number | null;
  worldCupMinutes: number | null;
  worldCupYellowCards: number | null;
  worldCupRedCards: number | null;
  championsLeagueGoals: number | null;
  championsLeagueAssists: number | null;
  championsLeagueAppearances: number | null;
  championsLeagueMinutes: number | null;
  championsLeagueYellowCards: number | null;
  championsLeagueRedCards: number | null;
}

export interface PlayerSearchCriteria {
  query: string;
  skip: number;
  limit: number;
  excludePlayerIds: string[];
  metricNotNull: boolean;
  metricColumn?: string;
  metricMinValue?: number;
  activeStatusFilter?: string;
  allowedRawPositions?: string[];
}

export interface FootballDataRepository {
  findById(id: string): Promise<PlayerRecord | null>;
  search(criteria: PlayerSearchCriteria): Promise<{ items: PlayerRecord[]; total: number }>;
  getMetricDistribution(
    metricCode: string,
    activeStatusFilter?: string,
  ): Promise<{
    count: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    min: number;
    max: number;
  }>;
}

export const FOOTBALL_DATA_REPOSITORY = Symbol('FOOTBALL_DATA_REPOSITORY');
