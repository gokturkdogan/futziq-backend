import { Injectable } from '@nestjs/common';
import {
  PerformanceRatingService,
  PerformanceRatingValue,
  RatingInput,
} from '../contracts/performance-rating';

@Injectable()
export class PercentDiffPerformanceRatingService implements PerformanceRatingService {
  rate(input: RatingInput): PerformanceRatingValue {
    if (input.exactHit) {
      return 'PERFECT';
    }

    const safeTarget = Math.max(input.targetValue, 1);
    const percentDiff = (input.absoluteDifference / safeTarget) * 100;
    const { thresholds } = input;

    if (percentDiff <= thresholds.perfectMaxPercentDiff) return 'PERFECT';
    if (percentDiff <= thresholds.excellentMaxPercentDiff) return 'EXCELLENT';
    if (percentDiff <= thresholds.goodMaxPercentDiff) return 'GOOD';
    if (percentDiff <= thresholds.averageMaxPercentDiff) return 'AVERAGE';
    return 'POOR';
  }
}
