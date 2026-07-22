import { Inject, Injectable } from '@nestjs/common';
import { ScopeCode } from '../contracts/game-types';
import {
  ScopeContext,
  ScopeDefinition,
  ScopeResolver,
  EligiblePlayerSummary,
  PlayerSearchQuery,
} from '../contracts/scope-resolver';
import { toPaginatedResult } from '../../common/pagination/pagination';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';
import { MetricRegistry } from '../registries/metric.registry';
import { MIN_SEARCH_LENGTH } from '../../football-data/infrastructure/prisma-football-data.repository';
import { PositionNormalizerService } from '../../football-data/application/position-normalizer.service';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { PlayerRecord } from '../../football-data/domain/football-data.repository';

function resolveCountryId(definition: ScopeDefinition, context: ScopeContext): string | null {
  const fromDefinition = definition.params?.countryId;
  if (typeof fromDefinition === 'string' && fromDefinition.length > 0) {
    return fromDefinition;
  }
  const fromContext = context.scopeParams?.countryId;
  return typeof fromContext === 'string' && fromContext.length > 0 ? fromContext : null;
}

@Injectable()
export class RandomCountryScopeResolver implements ScopeResolver {
  readonly code = ScopeCode.RANDOM_COUNTRY;

  constructor(
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
    private readonly metricRegistry: MetricRegistry,
    private readonly positionNormalizer: PositionNormalizerService,
  ) {}

  async searchEligiblePlayers(
    definition: ScopeDefinition,
    query: PlayerSearchQuery,
    context: ScopeContext,
  ) {
    const countryId = resolveCountryId(definition, context);
    if (!countryId) {
      return toPaginatedResult([], 0, query.page, query.limit);
    }

    if (query.query.length < MIN_SEARCH_LENGTH) {
      return toPaginatedResult([], 0, query.page, query.limit);
    }

    const metric = this.metricRegistry.get(context.definition.metric);
    const filter = await metric.buildEligibilityFilter({
      sessionId: context.sessionId,
      definition: context.definition,
    });
    const slot = query.slotCode
      ? context.definition.lineupTemplate?.slots.find((item) => item.code === query.slotCode)
      : undefined;

    const excludeSet = new Set(query.excludePlayerIds ?? []);
    const { items, total } = await this.footballData.search({
      query: query.query,
      skip: (query.page - 1) * query.limit,
      limit: query.limit,
      excludePlayerIds: query.excludePlayerIds ?? [],
      metricNotNull: filter.metricNotNull,
      metricColumn: filter.metricColumn,
      metricMinValue: filter.metricMinValue,
      activeStatusFilter: filter.activeStatusFilter,
      allowedRawPositions: slot
        ? this.positionNormalizer.getAllowedRawPositionsForSlot(slot)
        : undefined,
      countryId,
    });

    return toPaginatedResult(
      items.map((p) => this.toSummary(p, excludeSet)),
      total,
      query.page,
      query.limit,
    );
  }

  async isPlayerEligible(
    playerId: string,
    definition: ScopeDefinition,
    context: ScopeContext,
  ): Promise<boolean> {
    const countryId = resolveCountryId(definition, context);
    if (!countryId) {
      return false;
    }

    const belongsToCountry = await this.footballData.isPlayerFromCountry(playerId, countryId);
    if (!belongsToCountry) {
      return false;
    }

    const metric = this.metricRegistry.get(context.definition.metric);
    const value = await metric.resolveForPlayer(playerId, {
      sessionId: context.sessionId,
      definition: context.definition,
    });
    if (value == null) {
      return false;
    }

    if (
      context.definition.lineupTemplate == null ||
      context.definition.positionEligibilityPolicy == null
    ) {
      return true;
    }

    const player = await this.footballData.findById(playerId);
    if (!player) {
      return false;
    }

    const slotCode = context.scopeParams?.slotCode;
    if (typeof slotCode !== 'string') {
      return true;
    }

    const slot = context.definition.lineupTemplate.slots.find((item) => item.code === slotCode);
    if (!slot) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Requested lineup slot does not exist.',
        { slotCode },
      );
    }

    return this.positionNormalizer.isEligibleForSlot(
      player,
      slot,
      context.definition.positionEligibilityPolicy,
    );
  }

  private toSummary(player: PlayerRecord, excludeSet: Set<string>): EligiblePlayerSummary {
    return {
      id: player.id,
      displayName: player.displayName,
      firstName: player.firstName,
      lastName: player.lastName,
      primaryPosition: player.primaryPosition,
      subPosition: player.subPosition,
      normalizedPositions: this.positionNormalizer.getNormalizedPositions(player),
      isActive: player.isActive,
      alreadySelected: excludeSet.has(player.id),
    };
  }
}
