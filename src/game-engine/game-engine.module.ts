import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { MetricRegistry } from './registries/metric.registry';
import { ScopeRegistry } from './registries/scope.registry';
import { TargetGeneratorRegistry } from './registries/target-generator.registry';
import { ScoreCalculatorRegistry } from './registries/score-calculator.registry';
import { GameFamilyRegistry } from './registries/game-family.registry';
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
import { PercentDiffPerformanceRatingService } from './scoring/performance-rating.service';
import { TargetHuntFamilyHandler } from './families/target-hunt/target-hunt.handler';
import { DraftFamilyHandler } from './families/draft/draft.handler';
import { FootballDataModule } from '../football-data/football-data.module';
import { GameRuntimeModule } from '../game-runtime/game-runtime.module';

@Module({
  imports: [FootballDataModule, forwardRef(() => GameRuntimeModule)],
  providers: [
    MetricRegistry,
    ScopeRegistry,
    TargetGeneratorRegistry,
    ScoreCalculatorRegistry,
    GameFamilyRegistry,
    MetricRegistrationService,
    GlobalFreeScopeResolver,
    DataDistributionTargetGenerator,
    RandomRangeTargetGenerator,
    FixedTargetGenerator,
    { provide: DISTRIBUTION_PROVIDER, useClass: PrismaDistributionProvider },
    ClosestScoreCalculator,
    PercentDiffPerformanceRatingService,
    TargetHuntFamilyHandler,
    DraftFamilyHandler,
  ],
  exports: [
    MetricRegistry,
    ScopeRegistry,
    TargetGeneratorRegistry,
    ScoreCalculatorRegistry,
    GameFamilyRegistry,
    PercentDiffPerformanceRatingService,
    TargetHuntFamilyHandler,
    DraftFamilyHandler,
  ],
})
export class GameEngineModule implements OnModuleInit {
  constructor(
    private readonly scopeRegistry: ScopeRegistry,
    private readonly targetGeneratorRegistry: TargetGeneratorRegistry,
    private readonly scoreCalculatorRegistry: ScoreCalculatorRegistry,
    private readonly gameFamilyRegistry: GameFamilyRegistry,
    private readonly globalFreeResolver: GlobalFreeScopeResolver,
    private readonly dataDistributionGenerator: DataDistributionTargetGenerator,
    private readonly randomRangeGenerator: RandomRangeTargetGenerator,
    private readonly fixedGenerator: FixedTargetGenerator,
    private readonly closestCalculator: ClosestScoreCalculator,
    private readonly targetHuntHandler: TargetHuntFamilyHandler,
    private readonly draftHandler: DraftFamilyHandler,
  ) {}

  onModuleInit(): void {
    this.scopeRegistry.register(this.globalFreeResolver);
    this.targetGeneratorRegistry.register(this.dataDistributionGenerator);
    this.targetGeneratorRegistry.register(this.randomRangeGenerator);
    this.targetGeneratorRegistry.register(this.fixedGenerator);
    this.scoreCalculatorRegistry.register(this.closestCalculator);
    this.gameFamilyRegistry.register(this.targetHuntHandler);
    this.gameFamilyRegistry.register(this.draftHandler);
  }
}
