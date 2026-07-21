import { ComparisonType } from './game-types';

export interface ScoreInput {
  targetValue: number;
  aggregateValue: number;
  comparison: ComparisonType;
}

export interface ScoreResult {
  absoluteDifference: number;
  exactHit: boolean;
}

export interface ScoreCalculator {
  readonly comparison: ComparisonType;
  calculate(input: ScoreInput): ScoreResult;
}
