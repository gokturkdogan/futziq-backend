import { Inject, Injectable } from '@nestjs/common';
import { GameDefinitionConfig } from '../../contracts/game-types';
import { MetricRegistry } from '../../registries/metric.registry';
import { ScopeRegistry } from '../../registries/scope.registry';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
  PlayerRecord,
} from '../../../football-data/domain/football-data.repository';
import { DomainException, ErrorCode } from '../../../common/errors/domain.exception';

export interface PlayerSelectionValidationInput {
  sessionId: string;
  playerId: string;
  slotCode?: string;
  definition: GameDefinitionConfig;
}

@Injectable()
export class PlayerSelectionValidator {
  constructor(
    private readonly metricRegistry: MetricRegistry,
    private readonly scopeRegistry: ScopeRegistry,
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballDataRepository: FootballDataRepository,
  ) {}

  async resolvePlayer(input: PlayerSelectionValidationInput): Promise<{
    player: PlayerRecord;
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }> {
    const player = await this.footballDataRepository.findById(input.playerId);
    if (!player) {
      throw new DomainException(ErrorCode.PLAYER_NOT_FOUND, 'Player not found.', {
        playerId: input.playerId,
      });
    }

    const scopeResolver = this.scopeRegistry.get(input.definition.scope);
    const eligible = await scopeResolver.isPlayerEligible(
      input.playerId,
      { code: input.definition.scope, params: input.definition.scopeParams },
      {
        sessionId: input.sessionId,
        definition: input.definition,
        scopeParams: input.slotCode ? { slotCode: input.slotCode } : undefined,
      },
    );

    if (!eligible) {
      throw new DomainException(
        ErrorCode.PLAYER_NOT_ELIGIBLE,
        'Selected player is not eligible for this game session.',
        { playerId: input.playerId, slotCode: input.slotCode ?? null },
      );
    }

    const metricResolver = this.metricRegistry.get(input.definition.metric);
    const metric = await metricResolver.resolveForPlayer(input.playerId, {
      sessionId: input.sessionId,
      definition: input.definition,
    });

    if (!metric) {
      throw new DomainException(
        ErrorCode.METRIC_VALUE_MISSING,
        'Player metric value is missing or invalid.',
        { playerId: input.playerId },
      );
    }

    return {
      player,
      metricValue: metric.numericValue,
      playerSnapshot: this.buildPlayerSnapshot(player),
    };
  }

  buildPlayerSnapshot(player: PlayerRecord): Record<string, unknown> {
    return {
      id: player.id,
      displayName: player.displayName,
      firstName: player.firstName,
      lastName: player.lastName,
      primaryPosition: player.primaryPosition,
      subPosition: player.subPosition,
      heightCm: player.heightCm,
      isActive: player.isActive,
    };
  }
}
