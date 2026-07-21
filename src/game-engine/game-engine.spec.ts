import { createSeededRandom, randomIntInRange } from './core/seeded-random';
import { PercentDiffPerformanceRatingService } from './scoring/performance-rating.service';
import { ClosestScoreCalculator } from './scoring/closest-score.calculator';
import { DEFAULT_PERFORMANCE_RATING } from './contracts/game-types';
import { PositionNormalizerService } from '../football-data/application/position-normalizer.service';

describe('SeededRandom', () => {
  it('produces deterministic values for same seed', () => {
    const a = createSeededRandom('test-seed-123');
    const b = createSeededRandom('test-seed-123');
    const valuesA = Array.from({ length: 5 }, () => randomIntInRange(a, 100, 500));
    const valuesB = Array.from({ length: 5 }, () => randomIntInRange(b, 100, 500));
    expect(valuesA).toEqual(valuesB);
  });

  it('produces different values for different seeds', () => {
    const a = createSeededRandom('seed-a');
    const b = createSeededRandom('seed-b');
    expect(randomIntInRange(a, 100, 500)).not.toEqual(randomIntInRange(b, 100, 500));
  });
});

describe('ClosestScoreCalculator', () => {
  const calculator = new ClosestScoreCalculator();

  it('calculates absolute difference', () => {
    const result = calculator.calculate({ targetValue: 500, aggregateValue: 450 });
    expect(result.absoluteDifference).toBe(50);
    expect(result.exactHit).toBe(false);
  });

  it('detects exact hit', () => {
    const result = calculator.calculate({ targetValue: 500, aggregateValue: 500 });
    expect(result.exactHit).toBe(true);
    expect(result.absoluteDifference).toBe(0);
  });
});

describe('PercentDiffPerformanceRatingService', () => {
  const service = new PercentDiffPerformanceRatingService();

  it('returns PERFECT on exact hit', () => {
    expect(
      service.rate({
        targetValue: 500,
        absoluteDifference: 0,
        exactHit: true,
        thresholds: DEFAULT_PERFORMANCE_RATING,
      }),
    ).toBe('PERFECT');
  });

  it('rates by percent difference thresholds', () => {
    expect(
      service.rate({
        targetValue: 1000,
        absoluteDifference: 30,
        exactHit: false,
        thresholds: DEFAULT_PERFORMANCE_RATING,
      }),
    ).toBe('EXCELLENT');

    expect(
      service.rate({
        targetValue: 1000,
        absoluteDifference: 250,
        exactHit: false,
        thresholds: DEFAULT_PERFORMANCE_RATING,
      }),
    ).toBe('POOR');
  });
});

describe('DataDistributionTargetGenerator', () => {
  it('generates deterministic targets', async () => {
    const { DataDistributionTargetGenerator } = await import('./targeting/target-generators');
    const mockProvider = {
      getMetricDistribution: jest.fn().mockResolvedValue({
        count: 1000,
        p10: 5,
        p25: 10,
        p50: 25,
        p75: 60,
        p90: 110,
        min: 0,
        max: 500,
      }),
    };
    const generator = new DataDistributionTargetGenerator(mockProvider as never);
    const input = {
      seed: 'fixed-seed',
      sessionId: 'session-1',
      definition: {
        target: { strategy: 'DATA_DISTRIBUTION', minimum: 250, maximum: 1200, selectionCount: 5 },
      } as never,
    };
    const t1 = await generator.generate(input);
    const t2 = await generator.generate(input);
    expect(t1).toBe(t2);
    expect(t1).toBeGreaterThanOrEqual(50);
    expect(t1).toBeLessThanOrEqual(1200);
  });
});

describe('PositionNormalizerService', () => {
  const service = new PositionNormalizerService();

  it('normalizes primary and secondary positions', () => {
    const positions = service.getNormalizedPositions({
      id: '1',
      displayName: 'Test Player',
      firstName: null,
      lastName: null,
      primaryPosition: 'Defender',
      subPosition: 'Left-Back',
      isActive: true,
      heightCm: 182,
      totalGoals: null,
      totalAssists: null,
      totalYellowCards: null,
      totalRedCards: null,
      totalAppearances: null,
      totalMinutes: null,
      internationalGoals: null,
      internationalAssists: null,
      internationalAppearances: null,
      internationalMinutes: null,
      internationalYellowCards: null,
      internationalRedCards: null,
      clubGoals: null,
      clubAssists: null,
      clubAppearances: null,
      clubMinutes: null,
      clubYellowCards: null,
      clubRedCards: null,
      worldCupGoals: null,
      worldCupAssists: null,
      worldCupAppearances: null,
      worldCupMinutes: null,
      worldCupYellowCards: null,
      worldCupRedCards: null,
      championsLeagueGoals: null,
      championsLeagueAssists: null,
      championsLeagueAppearances: null,
      championsLeagueMinutes: null,
      championsLeagueYellowCards: null,
      championsLeagueRedCards: null,
    });

    expect(positions).toContain('LB');
    expect(positions).toContain('CB');
  });
});
