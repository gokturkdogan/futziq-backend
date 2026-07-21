import { Inject, Injectable } from '@nestjs/common';
import {
  AggregationType,
  GameActionType,
  GameEventType,
  GameFamily,
  GameDefinitionConfig,
  ObjectiveType,
  PositionEligibilityPolicy,
  RevealPolicy,
} from '../../contracts/game-types';
import {
  GameFamilyHandler,
  ProcessActionInput,
  ProcessActionResult,
} from '../../contracts/game-family-handler';
import { MetricRegistry } from '../../registries/metric.registry';
import { ScopeRegistry } from '../../registries/scope.registry';
import {
  GAME_SESSION_REPOSITORY,
  GameSessionRepository,
} from '../../../game-runtime/domain/game-session.repository';
import { DomainException, ErrorCode } from '../../../common/errors/domain.exception';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../../football-data/domain/football-data.repository';
import { PositionNormalizerService } from '../../../football-data/application/position-normalizer.service';

@Injectable()
export class DraftFamilyHandler implements GameFamilyHandler {
  readonly family = GameFamily.DRAFT;

  constructor(
    private readonly metricRegistry: MetricRegistry,
    private readonly scopeRegistry: ScopeRegistry,
    private readonly positionNormalizer: PositionNormalizerService,
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballDataRepository: FootballDataRepository,
    @Inject(GAME_SESSION_REPOSITORY)
    private readonly sessionRepository: GameSessionRepository,
  ) {}

  async initializeSession(): Promise<{ targetValue: number }> {
    return { targetValue: 0 };
  }

  shouldRevealMetric(definition: GameDefinitionConfig, phase: 'selection' | 'complete'): boolean {
    if (definition.revealPolicy === RevealPolicy.IMMEDIATE) return true;
    if (definition.revealPolicy === RevealPolicy.GAME_END) return phase === 'complete';
    return false;
  }

  async processAction(input: ProcessActionInput): Promise<ProcessActionResult> {
    if (input.actionType !== GameActionType.SELECT_PLAYER) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        `Unsupported action type: ${input.actionType}`,
      );
    }

    if (!('slotCode' in input.payload) || typeof input.payload.slotCode !== 'string') {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Draft player selection requires a slotCode.',
      );
    }

    return this.sessionRepository.processSelectPlayerAction(input, {
      validateAndResolve: async (ctx) => this.validateSelection(ctx),
      onComplete: async (ctx) => this.buildCompletion(ctx),
      shouldReveal: (definition, phase) => this.shouldRevealMetric(definition, phase),
    });
  }

  private async validateSelection(ctx: {
    sessionId: string;
    participantId: string;
    playerId: string;
    slotCode?: string;
    definition: GameDefinitionConfig;
    selectedPlayerIds: string[];
    existingSelections: Array<{
      playerId: string;
      selectionOrder: number;
      slotCode?: string | null;
      metricValue: number;
      playerSnapshot: Record<string, unknown>;
    }>;
  }): Promise<{ metricValue: number; playerSnapshot: Record<string, unknown> }> {
    const { definition, playerId, selectedPlayerIds, existingSelections } = ctx;

    if (!definition.lineupTemplate || !definition.positionEligibilityPolicy) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Draft definition is missing lineup configuration.',
      );
    }

    const slotCode = ctx.slotCode;
    const slot = definition.lineupTemplate.slots.find((item) => item.code === slotCode);
    if (!slotCode || !slot) {
      throw new DomainException(ErrorCode.INVALID_GAME_ACTION, 'Selected slot is invalid.', {
        slotCode,
      });
    }

    if (selectedPlayerIds.includes(playerId)) {
      throw new DomainException(
        ErrorCode.PLAYER_ALREADY_SELECTED,
        'Player has already been selected in this session.',
        { playerId },
      );
    }

    if (existingSelections.some((selection) => selection.slotCode === slotCode)) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Selected lineup slot is already occupied.',
        { slotCode },
      );
    }

    const player = await this.footballDataRepository.findById(playerId);
    if (!player) {
      throw new DomainException(ErrorCode.PLAYER_NOT_FOUND, 'Player not found.', { playerId });
    }

    const scopeResolver = this.scopeRegistry.get(definition.scope);
    const eligible = await scopeResolver.isPlayerEligible(
      playerId,
      { code: definition.scope, params: definition.scopeParams },
      { sessionId: ctx.sessionId, definition, scopeParams: { slotCode } },
    );

    if (!eligible) {
      throw new DomainException(
        ErrorCode.PLAYER_NOT_ELIGIBLE,
        'Selected player is not eligible for this draft slot.',
        { playerId, slotCode },
      );
    }

    const metricResolver = this.metricRegistry.get(definition.metric);
    const metric = await metricResolver.resolveForPlayer(playerId, {
      sessionId: ctx.sessionId,
      definition,
    });
    if (!metric) {
      throw new DomainException(
        ErrorCode.METRIC_VALUE_MISSING,
        'Player metric value is missing or invalid.',
        { playerId },
      );
    }

    if (
      !this.positionNormalizer.isEligibleForSlot(
        player,
        slot,
        definition.positionEligibilityPolicy ?? PositionEligibilityPolicy.PRIMARY_AND_SECONDARY,
      )
    ) {
      throw new DomainException(
        ErrorCode.PLAYER_NOT_ELIGIBLE,
        'Player is not eligible for the requested lineup slot.',
        { playerId, slotCode },
      );
    }

    const snapshot = await this.sessionRepository.getPlayerSnapshot(playerId);
    if (!snapshot) {
      throw new DomainException(ErrorCode.PLAYER_NOT_FOUND, 'Player not found.', { playerId });
    }

    return {
      metricValue: metric.numericValue,
      playerSnapshot: {
        ...snapshot,
        normalizedPositions: this.positionNormalizer.getNormalizedPositions(player),
      },
    };
  }

  private async buildCompletion(ctx: {
    targetValue: number;
    aggregateValue: number;
    definition: GameDefinitionConfig;
    selections: Array<{
      playerId: string;
      selectionOrder: number;
      slotCode?: string | null;
      metricValue: number;
      playerSnapshot: Record<string, unknown>;
    }>;
    startedAt: Date | null;
    completedAt: Date;
  }) {
    if (!ctx.definition.lineupTemplate) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Draft definition is missing lineup configuration.',
      );
    }

    const durationMs =
      ctx.startedAt != null ? ctx.completedAt.getTime() - ctx.startedAt.getTime() : 0;

    const lineup = ctx.definition.lineupTemplate.slots.map((slot) => {
      const selection = ctx.selections.find((item) => item.slotCode === slot.code);
      return {
        slotCode: slot.code,
        displayName: slot.displayName,
        acceptedPositionGroups: slot.acceptedPositionGroups,
        playerId: selection?.playerId ?? null,
        metricValue: selection?.metricValue ?? null,
        playerSnapshot: selection?.playerSnapshot ?? null,
      };
    });

    const totalMetricValue = this.aggregateSelections(ctx.selections, ctx.definition.aggregation);
    const averageMetricValue =
      ctx.selections.length > 0 ? Number((totalMetricValue / ctx.selections.length).toFixed(2)) : 0;

    return {
      targetValue: 0,
      aggregateValue: totalMetricValue,
      absoluteDifference: 0,
      exactHit: false,
      performanceRating: 'AVERAGE',
      resultPayload: {
        selectionCount: ctx.selections.length,
        totalMetricValue,
        averageMetricValue,
        objective: ctx.definition.objective ?? ObjectiveType.MAX,
        lineupTemplate: ctx.definition.lineupTemplate,
        lineup,
        selections: ctx.selections,
        durationMs,
        eventType: GameEventType.GAME_COMPLETED,
      },
    };
  }

  private aggregateSelections(
    selections: Array<{ metricValue: number }>,
    aggregation: AggregationType,
  ): number {
    const values = selections.map((item) => item.metricValue);
    if (values.length === 0) {
      return 0;
    }
    switch (aggregation) {
      case AggregationType.MAX:
        return Math.max(...values);
      case AggregationType.MIN:
        return Math.min(...values);
      case AggregationType.AVG:
        return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
      case AggregationType.SUM:
      default:
        return values.reduce((sum, value) => sum + value, 0);
    }
  }
}
