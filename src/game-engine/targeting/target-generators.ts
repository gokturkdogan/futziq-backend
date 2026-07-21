import { Injectable } from '@nestjs/common';
import {
  DistributionProvider,
  TargetGenerator,
  TargetGeneratorInput,
} from '../contracts/target-generator';
import { TargetGeneratorStrategy } from '../contracts/game-types';
import { createSeededRandom, randomIntInRange } from '../core/seeded-random';
import { Inject } from '@nestjs/common';
import { DISTRIBUTION_PROVIDER } from '../contracts/target-generator';

@Injectable()
export class DataDistributionTargetGenerator implements TargetGenerator {
  readonly strategy = TargetGeneratorStrategy.DATA_DISTRIBUTION;

  constructor(
    @Inject(DISTRIBUTION_PROVIDER)
    private readonly distributionProvider: DistributionProvider,
  ) {}

  async generate(input: TargetGeneratorInput): Promise<number> {
    if (!input.definition.target) {
      throw new Error('Target configuration is required for target generation');
    }
    const stats = await this.distributionProvider.getMetricDistribution(
      input.definition,
      input.sessionId,
    );

    const selectionCount = input.definition.target.selectionCount;
    const computedMin = Math.round(stats.p25 * selectionCount);
    const computedMax = Math.round(stats.p75 * selectionCount);

    const configMin = input.definition.target.minimum ?? computedMin;
    const configMax = input.definition.target.maximum ?? computedMax;

    const min = Math.max(configMin, computedMin);
    const max = Math.max(min + 1, Math.min(configMax, computedMax * 2));

    if (stats.count === 0) {
      return this.fallbackGenerate(input, min, max);
    }

    const random = createSeededRandom(`${input.seed}:target`);
    return randomIntInRange(random, min, max);
  }

  private fallbackGenerate(input: TargetGeneratorInput, min: number, max: number): number {
    const random = createSeededRandom(`${input.seed}:target:fallback`);
    return randomIntInRange(random, min, max);
  }
}

@Injectable()
export class RandomRangeTargetGenerator implements TargetGenerator {
  readonly strategy = TargetGeneratorStrategy.RANDOM_RANGE;

  async generate(input: TargetGeneratorInput): Promise<number> {
    if (!input.definition.target) {
      throw new Error('Target configuration is required for target generation');
    }
    const min = input.definition.target.minimum ?? 100;
    const max = input.definition.target.maximum ?? 1000;
    const random = createSeededRandom(`${input.seed}:target`);
    return randomIntInRange(random, min, max);
  }
}

@Injectable()
export class FixedTargetGenerator implements TargetGenerator {
  readonly strategy = TargetGeneratorStrategy.FIXED;

  async generate(input: TargetGeneratorInput): Promise<number> {
    if (!input.definition.target) {
      throw new Error('Target configuration is required for target generation');
    }
    if (input.definition.target.fixedValue == null) {
      throw new Error('Fixed target requires fixedValue in config');
    }
    return input.definition.target.fixedValue;
  }
}
