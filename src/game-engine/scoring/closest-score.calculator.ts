import { Injectable } from '@nestjs/common';
import { ComparisonType } from '../contracts/game-types';
import { ScoreCalculator } from '../contracts/score-calculator';

@Injectable()
export class ClosestScoreCalculator implements ScoreCalculator {
  readonly comparison = ComparisonType.CLOSEST;

  calculate(input: { targetValue: number; aggregateValue: number }): {
    absoluteDifference: number;
    exactHit: boolean;
  } {
    const absoluteDifference = Math.abs(input.targetValue - input.aggregateValue);
    return {
      absoluteDifference,
      exactHit: absoluteDifference === 0,
    };
  }
}
