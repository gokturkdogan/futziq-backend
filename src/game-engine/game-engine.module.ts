import { Module, OnModuleInit } from '@nestjs/common';
import { MetricRegistry } from './registries/metric.registry';
import { ScopeRegistry } from './registries/scope.registry';
import { TargetGeneratorRegistry } from './registries/target-generator.registry';
import { ScoreCalculatorRegistry } from './registries/score-calculator.registry';
import { GameFamilyPluginRegistry } from './registries/game-family-plugin.registry';
import { MetricRegistrationService } from './metrics/metric-resolvers';
import { GlobalFreeScopeResolver } from './scopes/global-free.scope-resolver';
import {
  DataDistributionTargetGenerator,
  FixedTargetGenerator,
  RandomRangeTargetGenerator,
} from './targeting/target-generators';
import { PrismaDistributionProvider } from './targeting/prisma-distribution.provider';
import { DISTRIBUTION_PROVIDER } from './contracts/target-generator';
import { ClosestScoreCalculator } from './scoring/closest-score.calculator';
import { HighestScoreCalculator } from './scoring/highest-score.calculator';
import { LowestScoreCalculator } from './scoring/lowest-score.calculator';
import { PercentDiffPerformanceRatingService } from './scoring/performance-rating.service';
import { TargetHuntFamilyPlugin } from './families/target-hunt/target-hunt.plugin';
import { DraftFamilyPlugin } from './families/draft/draft.plugin';
import { PlayerSelectionValidator } from './families/shared/player-selection.validator';
import { FootballDataModule } from '../football-data/football-data.module';
import { REDIS_CLIENT, NoOpRedisClient } from '../common/security/redis.client';

@Module({
  imports: [FootballDataModule],
  providers: [
    MetricRegistry,
    ScopeRegistry,
    TargetGeneratorRegistry,
    ScoreCalculatorRegistry,
    GameFamilyPluginRegistry,
    MetricRegistrationService,
    GlobalFreeScopeResolver,
    DataDistributionTargetGenerator,
    RandomRangeTargetGenerator,
    FixedTargetGenerator,
    { provide: DISTRIBUTION_PROVIDER, useClass: PrismaDistributionProvider },
    { provide: REDIS_CLIENT, useClass: NoOpRedisClient },
    ClosestScoreCalculator,
    HighestScoreCalculator,
    LowestScoreCalculator,
    PercentDiffPerformanceRatingService,
    PlayerSelectionValidator,
    TargetHuntFamilyPlugin,
    DraftFamilyPlugin,
  ],
  exports: [
    MetricRegistry,
    ScopeRegistry,
    TargetGeneratorRegistry,
    ScoreCalculatorRegistry,
    GameFamilyPluginRegistry,
    PercentDiffPerformanceRatingService,
    PlayerSelectionValidator,
    TargetHuntFamilyPlugin,
    DraftFamilyPlugin,
  ],
})
export class GameEngineModule implements OnModuleInit {
  constructor(
    private readonly scopeRegistry: ScopeRegistry,
    private readonly targetGeneratorRegistry: TargetGeneratorRegistry,
    private readonly scoreCalculatorRegistry: ScoreCalculatorRegistry,
    private readonly pluginRegistry: GameFamilyPluginRegistry,
    private readonly globalFreeResolver: GlobalFreeScopeResolver,
    private readonly dataDistributionGenerator: DataDistributionTargetGenerator,
    private readonly randomRangeGenerator: RandomRangeTargetGenerator,
    private readonly fixedGenerator: FixedTargetGenerator,
    private readonly closestCalculator: ClosestScoreCalculator,
    private readonly highestCalculator: HighestScoreCalculator,
    private readonly lowestCalculator: LowestScoreCalculator,
    private readonly targetHuntPlugin: TargetHuntFamilyPlugin,
    private readonly draftPlugin: DraftFamilyPlugin,
  ) {}

  onModuleInit(): void {
    this.scopeRegistry.register(this.globalFreeResolver);
    this.targetGeneratorRegistry.register(this.dataDistributionGenerator);
    this.targetGeneratorRegistry.register(this.randomRangeGenerator);
    this.targetGeneratorRegistry.register(this.fixedGenerator);
    this.scoreCalculatorRegistry.register(this.closestCalculator);
    this.scoreCalculatorRegistry.register(this.highestCalculator);
    this.scoreCalculatorRegistry.register(this.lowestCalculator);
    this.pluginRegistry.register(this.targetHuntPlugin);
    this.pluginRegistry.register(this.draftPlugin);
  }
}
