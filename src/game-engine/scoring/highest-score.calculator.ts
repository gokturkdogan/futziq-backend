import { Injectable } from '@nestjs/common';
import { ComparisonType } from '../contracts/game-types';
import { ScoreCalculator } from '../contracts/score-calculator';

@Injectable()
export class HighestScoreCalculator implements ScoreCalculator {
  readonly comparison = ComparisonType.HIGHEST;

  calculate(input: { targetValue: number; aggregateValue: number }) {
    return {
      absoluteDifference: Math.max(0, input.targetValue - input.aggregateValue),
      exactHit: input.aggregateValue >= input.targetValue,
    };
  }
}
