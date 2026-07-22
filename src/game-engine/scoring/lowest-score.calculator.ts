import { Injectable } from '@nestjs/common';
import { ComparisonType } from '../contracts/game-types';
import { ScoreCalculator } from '../contracts/score-calculator';

@Injectable()
export class LowestScoreCalculator implements ScoreCalculator {
  readonly comparison = ComparisonType.LOWEST;

  calculate(input: { targetValue: number; aggregateValue: number }) {
    return {
      absoluteDifference: Math.max(0, input.aggregateValue - input.targetValue),
      exactHit: input.aggregateValue <= input.targetValue,
    };
  }
}
