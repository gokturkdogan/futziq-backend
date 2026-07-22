import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { GameDefinitionConfig } from '../../game-engine/contracts/game-types';
import { resolveMetricField } from '../../game-engine/metrics/metric-field-map';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { PlayerMode } from '../domain/session-runtime';
import {
  DraftRoundRuntime,
  DraftRoundScopeType,
  DraftScopeEntityView,
} from '../domain/draft-round';

const MIN_PLAYERS_PER_SCOPE = 5;

@Injectable()
export class DraftRoundScopeService {
  constructor(
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
  ) {}

  async initializeRoundState(input: {
    scopeType: DraftRoundScopeType;
    selectionCount: number;
    playerMode: PlayerMode;
    seed: string;
    metricCode: string;
  }): Promise<DraftRoundRuntime> {
    const entity = await this.pickRandomEntity({
      scopeType: input.scopeType,
      seed: input.seed,
      roundNumber: 1,
      metricCode: input.metricCode,
      excludeIds: [],
    });

    return {
      scopeType: input.scopeType,
      currentRound: 1,
      totalRounds: input.selectionCount,
      picksInCurrentRound: 0,
      picksPerRound: input.playerMode === PlayerMode.MULTIPLAYER ? 2 : 1,
      currentEntity: entity,
      usedEntityIds: [entity.id],
    };
  }

  async pickNextRoundEntity(input: {
    scopeType: DraftRoundScopeType;
    seed: string;
    roundNumber: number;
    metricCode: string;
    usedEntityIds: string[];
  }): Promise<DraftScopeEntityView> {
    return this.pickRandomEntity({
      scopeType: input.scopeType,
      seed: input.seed,
      roundNumber: input.roundNumber,
      metricCode: input.metricCode,
      excludeIds: input.usedEntityIds,
    });
  }

  applyScopeParamsToConfig(
    config: GameDefinitionConfig,
    draftRound: DraftRoundRuntime,
  ): GameDefinitionConfig {
    const scopeParams =
      draftRound.scopeType === 'CLUB'
        ? { clubId: draftRound.currentEntity.id }
        : { countryId: draftRound.currentEntity.id };

    return {
      ...config,
      scopeParams,
    };
  }

  private async pickRandomEntity(input: {
    scopeType: DraftRoundScopeType;
    seed: string;
    roundNumber: number;
    metricCode: string;
    excludeIds: string[];
  }): Promise<DraftScopeEntityView> {
    const metricColumn = resolveMetricField(input.metricCode).sqlColumn;
    const candidates =
      input.scopeType === 'CLUB'
        ? await this.footballData.findEligibleClubs(
            metricColumn,
            MIN_PLAYERS_PER_SCOPE,
            input.excludeIds,
          )
        : await this.footballData.findEligibleCountries(
            metricColumn,
            MIN_PLAYERS_PER_SCOPE,
            input.excludeIds,
          );

    if (candidates.length === 0) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_SCOPE_COMBINATION,
        `No eligible ${input.scopeType.toLowerCase()} found for draft round scope.`,
        { scopeType: input.scopeType, roundNumber: input.roundNumber },
      );
    }

    const index = this.seededIndex(input.seed, input.roundNumber, candidates.length);
    const picked = candidates[index];

    return {
      type: input.scopeType,
      id: picked.id,
      name: picked.name,
      logoUrl: picked.logoUrl,
    };
  }

  private seededIndex(seed: string, roundNumber: number, length: number): number {
    const hash = createHash('sha1').update(`${seed}:round:${roundNumber}`).digest();
    return hash.readUInt32BE(0) % length;
  }
}
