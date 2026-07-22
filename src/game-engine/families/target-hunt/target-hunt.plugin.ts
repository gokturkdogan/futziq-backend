import { Injectable } from '@nestjs/common';
import {
  GameFamily,
  GameActionType,
  GameEventType,
  RevealPolicy,
  DuplicatePolicy,
  DEFAULT_PERFORMANCE_RATING,
  GameDefinitionConfig,
} from '../../contracts/game-types';
import {
  CompletionContext,
  GameFamilyPlugin,
  SelectionValidationContext,
} from '../../contracts/game-family.plugin';
import { deriveCapabilitiesFromConfig } from '../../../client-contract/capabilities';
import { TargetGeneratorRegistry } from '../../registries/target-generator.registry';
import { ScoreCalculatorRegistry } from '../../registries/score-calculator.registry';
import { PercentDiffPerformanceRatingService } from '../../scoring/performance-rating.service';
import { resolveTargetStrategy } from '../../core/config-parser';
import { DomainException, ErrorCode } from '../../../common/errors/domain.exception';
import { PlayerSelectionValidator } from '../shared/player-selection.validator';

@Injectable()
export class TargetHuntFamilyPlugin implements GameFamilyPlugin {
  readonly family = GameFamily.TARGET_HUNT;
  readonly supportedActions = [GameActionType.SELECT_PLAYER];
  readonly capabilities = deriveCapabilitiesFromConfig(
    GameFamily.TARGET_HUNT,
    {
      family: GameFamily.TARGET_HUNT,
      selectionCount: 5,
    } as GameDefinitionConfig,
    true,
  );

  constructor(
    private readonly targetGeneratorRegistry: TargetGeneratorRegistry,
    private readonly scoreCalculatorRegistry: ScoreCalculatorRegistry,
    private readonly performanceRating: PercentDiffPerformanceRatingService,
    private readonly selectionValidator: PlayerSelectionValidator,
  ) {}

  async initializeSession(
    sessionId: string,
    definition: GameDefinitionConfig,
    seed: string,
  ): Promise<{ targetValue: number }> {
    const strategy = resolveTargetStrategy(definition);
    const generator = this.targetGeneratorRegistry.get(strategy);
    const targetValue = await generator.generate({
      seed,
      definition,
      sessionId,
    });
    return { targetValue };
  }

  shouldRevealMetric(definition: GameDefinitionConfig, phase: 'selection' | 'complete'): boolean {
    if (definition.revealPolicy === RevealPolicy.IMMEDIATE) return true;
    if (definition.revealPolicy === RevealPolicy.GAME_END) return phase === 'complete';
    return false;
  }

  async validateSelection(ctx: SelectionValidationContext) {
    const { definition, playerId, selectedPlayerIds } = ctx;

    if (selectedPlayerIds.includes(playerId)) {
      throw new DomainException(
        ErrorCode.PLAYER_ALREADY_SELECTED,
        'Player has already been selected in this session.',
        { playerId },
      );
    }

    if (
      definition.duplicatePolicy === DuplicatePolicy.REJECT_ANY_PARTICIPANT &&
      (await ctx.isPlayerSelectedInSession(playerId))
    ) {
      throw new DomainException(
        ErrorCode.PLAYER_ALREADY_SELECTED,
        'Player has already been selected by another participant.',
        { playerId },
      );
    }

    const resolved = await this.selectionValidator.resolvePlayer({
      sessionId: ctx.sessionId,
      playerId,
      definition,
    });

    return {
      metricValue: resolved.metricValue,
      playerSnapshot: resolved.playerSnapshot,
    };
  }

  async buildCompletion(ctx: CompletionContext) {
    const calculator = this.scoreCalculatorRegistry.get(ctx.definition.comparison);
    const score = calculator.calculate({
      targetValue: ctx.targetValue,
      aggregateValue: ctx.aggregateValue,
      comparison: ctx.definition.comparison,
    });

    const performanceRating = this.performanceRating.rate({
      targetValue: ctx.targetValue,
      absoluteDifference: score.absoluteDifference,
      exactHit: score.exactHit,
      thresholds: ctx.definition.performanceRating ?? DEFAULT_PERFORMANCE_RATING,
    });

    const durationMs =
      ctx.startedAt != null ? ctx.completedAt.getTime() - ctx.startedAt.getTime() : 0;

    return {
      targetValue: ctx.targetValue,
      aggregateValue: ctx.aggregateValue,
      absoluteDifference: score.absoluteDifference,
      exactHit: score.exactHit,
      performanceRating,
      resultPayload: {
        selectionCount: ctx.selections.length,
        selections: ctx.selections,
        durationMs,
        eventType: GameEventType.GAME_COMPLETED,
      },
    };
  }
}
