import { Inject, Injectable } from '@nestjs/common';
import { DistributionProvider, DistributionStats } from '../contracts/target-generator';
import { GameDefinitionConfig } from '../contracts/game-types';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';

@Injectable()
export class PrismaDistributionProvider implements DistributionProvider {
  constructor(
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
  ) {}

  async getMetricDistribution(
    definition: GameDefinitionConfig,
    _sessionId: string,
  ): Promise<DistributionStats> {
    return this.footballData.getMetricDistribution(
      definition.metric,
      definition.activeStatusFilter,
    );
  }
}
