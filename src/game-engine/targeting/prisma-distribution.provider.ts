import { Inject, Injectable, Optional } from '@nestjs/common';
import { DistributionProvider, DistributionStats } from '../contracts/target-generator';
import { GameDefinitionConfig } from '../contracts/game-types';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';
import { REDIS_CLIENT, RedisClient } from '../../common/security/redis.client';

const CACHE_TTL_SECONDS = 3600;

@Injectable()
export class PrismaDistributionProvider implements DistributionProvider {
  constructor(
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: RedisClient,
  ) {}

  async getMetricDistribution(
    definition: GameDefinitionConfig,
    _sessionId: string,
  ): Promise<DistributionStats> {
    const cacheKey = `metric-dist:${definition.metric}:${definition.activeStatusFilter}`;
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DistributionStats;
      }
    }

    const stats = await this.footballData.getMetricDistribution(
      definition.metric,
      definition.activeStatusFilter,
    );

    if (this.redis) {
      await this.redis.set(cacheKey, JSON.stringify(stats), CACHE_TTL_SECONDS);
    }

    return stats;
  }
}
