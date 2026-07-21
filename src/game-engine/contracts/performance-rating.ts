import { PerformanceRatingThresholds } from './game-types';

export interface RatingInput {
  targetValue: number;
  absoluteDifference: number;
  exactHit: boolean;
  thresholds: PerformanceRatingThresholds;
}

export type PerformanceRatingValue = 'PERFECT' | 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';

export interface PerformanceRatingService {
  rate(input: RatingInput): PerformanceRatingValue;
}
