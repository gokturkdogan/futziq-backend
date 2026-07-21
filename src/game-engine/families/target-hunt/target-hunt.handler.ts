import { Inject, Injectable } from '@nestjs/common';
import {
  GameFamily,
  GameActionType,
  GameEventType,
  RevealPolicy,
  DuplicatePolicy,
  DEFAULT_PERFORMANCE_RATING,
} from '../../contracts/game-types';
import {
  GameFamilyHandler,
  ProcessActionInput,
  ProcessActionResult,
} from '../../contracts/game-family-handler';
import { TargetGeneratorRegistry } from '../../registries/target-generator.registry';
import { MetricRegistry } from '../../registries/metric.registry';
import { ScopeRegistry } from '../../registries/scope.registry';
import { ScoreCalculatorRegistry } from '../../registries/score-calculator.registry';
import { PercentDiffPerformanceRatingService } from '../../scoring/performance-rating.service';
import { resolveTargetStrategy } from '../../core/config-parser';
import { GameDefinitionConfig } from '../../contracts/game-types';
import {
  GAME_SESSION_REPOSITORY,
  GameSessionRepository,
} from '../../../game-runtime/domain/game-session.repository';
import { DomainException, ErrorCode } from '../../../common/errors/domain.exception';

@Injectable()
export class TargetHuntFamilyHandler implements GameFamilyHandler {
  readonly family = GameFamily.TARGET_HUNT;

  constructor(
    private readonly targetGeneratorRegistry: TargetGeneratorRegistry,
    private readonly metricRegistry: MetricRegistry,
    private readonly scopeRegistry: ScopeRegistry,
    private readonly scoreCalculatorRegistry: ScoreCalculatorRegistry,
    private readonly performanceRating: PercentDiffPerformanceRatingService,
    @Inject(GAME_SESSION_REPOSITORY)
    private readonly sessionRepository: GameSessionRepository,
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

  async processAction(input: ProcessActionInput): Promise<ProcessActionResult> {
    if (input.actionType !== GameActionType.SELECT_PLAYER) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        `Unsupported action type: ${input.actionType}`,
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
    definition: GameDefinitionConfig;
    selectedPlayerIds: string[];
  }): Promise<{
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }> {
    const { definition, playerId, selectedPlayerIds } = ctx;

    if (selectedPlayerIds.includes(playerId)) {
      throw new DomainException(
        ErrorCode.PLAYER_ALREADY_SELECTED,
        'Player has already been selected in this session.',
        { playerId },
      );
    }

    const scopeResolver = this.scopeRegistry.get(definition.scope);
    const eligible = await scopeResolver.isPlayerEligible(
      playerId,
      { code: definition.scope, params: definition.scopeParams },
      { sessionId: ctx.sessionId, definition },
    );

    if (!eligible) {
      throw new DomainException(
        ErrorCode.PLAYER_NOT_ELIGIBLE,
        'Selected player is not eligible for this game session.',
        { playerId },
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

    const player = await this.sessionRepository.getPlayerSnapshot(playerId);
    if (!player) {
      throw new DomainException(ErrorCode.PLAYER_NOT_FOUND, 'Player not found.', { playerId });
    }

    if (
      definition.duplicatePolicy === DuplicatePolicy.REJECT_ANY_PARTICIPANT &&
      (await this.sessionRepository.isPlayerSelectedInSession(ctx.sessionId, playerId))
    ) {
      throw new DomainException(
        ErrorCode.PLAYER_ALREADY_SELECTED,
        'Player has already been selected by another participant.',
        { playerId },
      );
    }

    return {
      metricValue: metric.numericValue,
      playerSnapshot: player,
    };
  }

  private async buildCompletion(ctx: {
    targetValue: number;
    aggregateValue: number;
    definition: GameDefinitionConfig;
    selections: Array<{
      playerId: string;
      selectionOrder: number;
      metricValue: number;
      playerSnapshot: Record<string, unknown>;
    }>;
    startedAt: Date | null;
    completedAt: Date;
  }) {
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
