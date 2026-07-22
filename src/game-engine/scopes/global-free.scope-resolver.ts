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

@Injectable()
export class GlobalFreeScopeResolver implements ScopeResolver {
  readonly code = ScopeCode.GLOBAL_FREE;

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
    });

    const summaries: EligiblePlayerSummary[] = items.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      firstName: p.firstName,
      lastName: p.lastName,
      primaryPosition: p.primaryPosition,
      subPosition: p.subPosition,
      normalizedPositions: this.positionNormalizer.getNormalizedPositions(p),
      isActive: p.isActive,
      alreadySelected: excludeSet.has(p.id),
    }));

    return toPaginatedResult(summaries, total, query.page, query.limit);
  }

  async isPlayerEligible(
    playerId: string,
    _definition: ScopeDefinition,
    context: ScopeContext,
  ): Promise<boolean> {
    if (
      context.definition.lineupTemplate == null ||
      context.definition.positionEligibilityPolicy == null
    ) {
      const metric = this.metricRegistry.get(context.definition.metric);
      const value = await metric.resolveForPlayer(playerId, {
        sessionId: context.sessionId,
        definition: context.definition,
      });
      return value != null;
    }

    const player = await this.footballData.findById(playerId);
    if (!player) {
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
}
