import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import {
  FootballDataRepository,
  PlayerRecord,
  PlayerSearchCriteria,
} from '../domain/football-data.repository';
import { ActiveStatusFilter } from '../../game-engine/contracts/game-types';
import { resolveMetricField } from '../../game-engine/metrics/metric-field-map';

const MIN_SEARCH_LENGTH = 2;

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Maps MetricCode to the Prisma model field and the raw SQL column name. */
function resolveMetricColumn(metricCode: string) {
  const field = resolveMetricField(metricCode);
  return { prismaField: field.prismaField, sqlColumn: field.sqlColumn };
}

@Injectable()
export class PrismaFootballDataRepository implements FootballDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PlayerRecord | null> {
    const player = await this.prisma.player.findUnique({ where: { id } });
    return player ? this.toRecord(player) : null;
  }

  async isPlayerInClub(playerId: string, clubId: string): Promise<boolean> {
    const count = await this.prisma.player.count({
      where: {
        id: playerId,
        OR: [
          { currentClubId: clubId },
          { playerClubs: { some: { clubId } } },
        ],
      },
    });
    return count > 0;
  }

  async isPlayerFromCountry(playerId: string, countryId: string): Promise<boolean> {
    const count = await this.prisma.player.count({
      where: { id: playerId, nationalityCountryId: countryId },
    });
    return count > 0;
  }

  async findEligibleClubs(
    metricColumn: string,
    minPlayers: number,
    excludeIds: string[] = [],
  ): Promise<Array<{ id: string; name: string; logoUrl: string | null }>> {
    const excludeClause =
      excludeIds.length > 0
        ? `AND c.id NOT IN (${excludeIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`
        : '';

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; name: string; logo_url: string | null }>
    >(
      `SELECT c.id, c.name, c.logo_url
       FROM clubs c
       INNER JOIN player_clubs pc ON pc.club_id = c.id
       INNER JOIN players p ON p.id = pc.player_id
       WHERE p.${metricColumn} IS NOT NULL
       ${excludeClause}
       GROUP BY c.id, c.name, c.logo_url
       HAVING COUNT(DISTINCT p.id) >= ${minPlayers}
       ORDER BY c.name ASC`,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
    }));
  }

  async findEligibleCountries(
    metricColumn: string,
    minPlayers: number,
    excludeIds: string[] = [],
  ): Promise<Array<{ id: string; name: string; logoUrl: string | null }>> {
    const excludeClause =
      excludeIds.length > 0
        ? `AND co.id NOT IN (${excludeIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`
        : '';

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; name: string; flag_url: string | null }>
    >(
      `SELECT co.id, co.name, co.flag_url
       FROM countries co
       INNER JOIN players p ON p.nationality_country_id = co.id
       WHERE p.${metricColumn} IS NOT NULL
       ${excludeClause}
       GROUP BY co.id, co.name, co.flag_url
       HAVING COUNT(DISTINCT p.id) >= ${minPlayers}
       ORDER BY co.name ASC`,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logoUrl: row.flag_url,
    }));
  }

  async search(criteria: PlayerSearchCriteria): Promise<{
    items: PlayerRecord[];
    total: number;
  }> {
    if (criteria.query.length < MIN_SEARCH_LENGTH) {
      return { items: [], total: 0 };
    }

    const normalized = stripDiacritics(criteria.query.trim());
    const where = this.buildWhereClause(criteria, normalized);

    const [items, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        skip: criteria.skip,
        take: criteria.limit,
        orderBy: [{ displayName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.player.count({ where }),
    ]);

    return { items: items.map((p) => this.toRecord(p)), total };
  }

  async getMetricDistribution(
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
  }> {
    const { sqlColumn } = resolveMetricColumn(metricCode);
    const activeClause = this.activeStatusSql(activeStatusFilter);

    const result = await this.prisma.$queryRawUnsafe<
      Array<{
        count: bigint;
        p10: number;
        p25: number;
        p50: number;
        p75: number;
        p90: number;
        min_val: number;
        max_val: number;
      }>
    >(
      `SELECT
        COUNT(*)::bigint as count,
        COALESCE(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY ${sqlColumn}), 0) as p10,
        COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${sqlColumn}), 0) as p25,
        COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${sqlColumn}), 0) as p50,
        COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${sqlColumn}), 0) as p75,
        COALESCE(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ${sqlColumn}), 0) as p90,
        COALESCE(MIN(${sqlColumn}), 0) as min_val,
        COALESCE(MAX(${sqlColumn}), 0) as max_val
      FROM players
      WHERE ${sqlColumn} IS NOT NULL AND ${sqlColumn} >= 0
      ${activeClause}`,
    );

    const row = result[0];
    return {
      count: Number(row?.count ?? 0),
      p10: Number(row?.p10 ?? 0),
      p25: Number(row?.p25 ?? 0),
      p50: Number(row?.p50 ?? 0),
      p75: Number(row?.p75 ?? 0),
      p90: Number(row?.p90 ?? 0),
      min: Number(row?.min_val ?? 0),
      max: Number(row?.max_val ?? 0),
    };
  }

  private buildWhereClause(criteria: PlayerSearchCriteria, normalized: string) {
    const activeFilter = this.activeStatusPrisma(criteria.activeStatusFilter);
    const metricField = criteria.metricColumn ?? 'totalGoals';

    return {
      AND: [
        activeFilter,
        criteria.metricNotNull ? { [metricField]: { not: null } } : {},
        criteria.metricMinValue != null ? { [metricField]: { gte: criteria.metricMinValue } } : {},
        criteria.excludePlayerIds.length ? { id: { notIn: criteria.excludePlayerIds } } : {},
        criteria.clubId
          ? {
              OR: [
                { currentClubId: criteria.clubId },
                { playerClubs: { some: { clubId: criteria.clubId } } },
              ],
            }
          : {},
        criteria.countryId ? { nationalityCountryId: criteria.countryId } : {},
        criteria.allowedRawPositions?.length
          ? {
              OR: [
                { primaryPosition: { in: criteria.allowedRawPositions } },
                { subPosition: { in: criteria.allowedRawPositions } },
              ],
            }
          : {},
        {
          OR: [
            { displayName: { contains: normalized, mode: 'insensitive' as const } },
            { firstName: { contains: normalized, mode: 'insensitive' as const } },
            { lastName: { contains: normalized, mode: 'insensitive' as const } },
          ],
        },
      ],
    };
  }

  private activeStatusPrisma(filter?: string) {
    if (filter === ActiveStatusFilter.ACTIVE_ONLY) {
      return { isActive: true };
    }
    if (filter === ActiveStatusFilter.RETIRED_ONLY) {
      return { OR: [{ isActive: false }, { isActive: null }] };
    }
    return {};
  }

  private activeStatusSql(filter?: string): string {
    if (filter === ActiveStatusFilter.ACTIVE_ONLY) {
      return 'AND is_active = true';
    }
    if (filter === ActiveStatusFilter.RETIRED_ONLY) {
      return 'AND (is_active = false OR is_active IS NULL)';
    }
    return '';
  }

  private toRecord(player: {
    id: string;
    displayName: string | null;
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
  }): PlayerRecord {
    return {
      id: player.id,
      displayName:
        player.displayName ??
        [player.firstName, player.lastName].filter(Boolean).join(' ') ??
        'Unknown',
      firstName: player.firstName,
      lastName: player.lastName,
      primaryPosition: player.primaryPosition,
      subPosition: player.subPosition,
      isActive: player.isActive,
      heightCm: player.heightCm,
      totalGoals: player.totalGoals,
      totalAssists: player.totalAssists,
      totalYellowCards: player.totalYellowCards,
      totalRedCards: player.totalRedCards,
      totalAppearances: player.totalAppearances,
      totalMinutes: player.totalMinutes,
      internationalGoals: player.internationalGoals,
      internationalAssists: player.internationalAssists,
      internationalAppearances: player.internationalAppearances,
      internationalMinutes: player.internationalMinutes,
      internationalYellowCards: player.internationalYellowCards,
      internationalRedCards: player.internationalRedCards,
      clubGoals: player.clubGoals,
      clubAssists: player.clubAssists,
      clubAppearances: player.clubAppearances,
      clubMinutes: player.clubMinutes,
      clubYellowCards: player.clubYellowCards,
      clubRedCards: player.clubRedCards,
      worldCupGoals: player.worldCupGoals,
      worldCupAssists: player.worldCupAssists,
      worldCupAppearances: player.worldCupAppearances,
      worldCupMinutes: player.worldCupMinutes,
      worldCupYellowCards: player.worldCupYellowCards,
      worldCupRedCards: player.worldCupRedCards,
      championsLeagueGoals: player.championsLeagueGoals,
      championsLeagueAssists: player.championsLeagueAssists,
      championsLeagueAppearances: player.championsLeagueAppearances,
      championsLeagueMinutes: player.championsLeagueMinutes,
      championsLeagueYellowCards: player.championsLeagueYellowCards,
      championsLeagueRedCards: player.championsLeagueRedCards,
    };
  }
}

export { MIN_SEARCH_LENGTH, resolveMetricColumn };
