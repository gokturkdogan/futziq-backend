import { Injectable } from '@nestjs/common';
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
  CompletionContext,
  GameFamilyPlugin,
  SelectionValidationContext,
} from '../../contracts/game-family.plugin';
import { deriveCapabilitiesFromConfig } from '../../../client-contract/capabilities';
import { ScoreCalculatorRegistry } from '../../registries/score-calculator.registry';
import { DomainException, ErrorCode } from '../../../common/errors/domain.exception';
import { PositionNormalizerService } from '../../../football-data/application/position-normalizer.service';
import { PlayerSelectionValidator } from '../shared/player-selection.validator';
import { buildDraftLineup } from '../../../game-runtime/domain/draft-lineup';

@Injectable()
export class DraftFamilyPlugin implements GameFamilyPlugin {
  readonly family = GameFamily.DRAFT;
  readonly supportedActions = [GameActionType.SELECT_PLAYER];
  readonly capabilities = deriveCapabilitiesFromConfig(
    GameFamily.DRAFT,
    {
      family: GameFamily.DRAFT,
      selectionCount: 6,
    } as GameDefinitionConfig,
    false,
  );

  constructor(
    private readonly selectionValidator: PlayerSelectionValidator,
    private readonly positionNormalizer: PositionNormalizerService,
    private readonly scoreCalculatorRegistry: ScoreCalculatorRegistry,
  ) {}

  async initializeSession(): Promise<{ targetValue: number }> {
    return { targetValue: 0 };
  }

  shouldRevealMetric(definition: GameDefinitionConfig, phase: 'selection' | 'complete'): boolean {
    if (definition.revealPolicy === RevealPolicy.IMMEDIATE) return true;
    if (definition.revealPolicy === RevealPolicy.GAME_END) return phase === 'complete';
    return false;
  }

  async validateSelection(ctx: SelectionValidationContext) {
    if (!ctx.slotCode || typeof ctx.slotCode !== 'string') {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Draft player selection requires a slotCode.',
      );
    }

    const { definition, playerId, selectedPlayerIds, existingSelections, slotCode } = ctx;

    if (!definition.lineupTemplate || !definition.positionEligibilityPolicy) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Draft definition is missing lineup configuration.',
      );
    }

    const slot = definition.lineupTemplate.slots.find((item) => item.code === slotCode);
    if (!slot) {
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

    const resolved = await this.selectionValidator.resolvePlayer({
      sessionId: ctx.sessionId,
      playerId,
      slotCode,
      definition,
    });

    if (
      !this.positionNormalizer.isEligibleForSlot(
        resolved.player,
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

    return {
      metricValue: resolved.metricValue,
      playerSnapshot: {
        ...resolved.playerSnapshot,
        normalizedPositions: this.positionNormalizer.getNormalizedPositions(resolved.player),
      },
    };
  }

  async buildCompletion(ctx: CompletionContext) {
    if (!ctx.definition.lineupTemplate) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        'Draft definition is missing lineup configuration.',
      );
    }

    const durationMs =
      ctx.startedAt != null ? ctx.completedAt.getTime() - ctx.startedAt.getTime() : 0;

    const lineup = buildDraftLineup(ctx.definition, ctx.selections) ?? [];
    const totalMetricValue = this.aggregateSelections(ctx.selections, ctx.definition.aggregation);
    const averageMetricValue =
      ctx.selections.length > 0 ? Number((totalMetricValue / ctx.selections.length).toFixed(2)) : 0;

    const score = this.scoreCalculatorRegistry.get(ctx.definition.comparison).calculate({
      targetValue: ctx.targetValue,
      aggregateValue: totalMetricValue,
      comparison: ctx.definition.comparison,
    });

    return {
      targetValue: 0,
      aggregateValue: totalMetricValue,
      absoluteDifference: score.absoluteDifference,
      exactHit: score.exactHit,
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
