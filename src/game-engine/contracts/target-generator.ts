import { GameDefinitionConfig } from './game-types';

export interface TargetGeneratorInput {
  seed: string;
  definition: GameDefinitionConfig;
  sessionId: string;
}

export interface TargetGenerator {
  readonly strategy: string;
  generate(input: TargetGeneratorInput): Promise<number>;
}

export interface DistributionStats {
  count: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
}

export interface DistributionProvider {
  getMetricDistribution(
    definition: GameDefinitionConfig,
    sessionId: string,
  ): Promise<DistributionStats>;
}

export const DISTRIBUTION_PROVIDER = Symbol('DISTRIBUTION_PROVIDER');
