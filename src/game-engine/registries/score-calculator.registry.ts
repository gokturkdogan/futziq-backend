import { Injectable } from '@nestjs/common';
import { ScoreCalculator } from '../contracts/score-calculator';
import { ComparisonType } from '../contracts/game-types';

@Injectable()
export class ScoreCalculatorRegistry {
  private readonly calculators = new Map<ComparisonType, ScoreCalculator>();

  register(calculator: ScoreCalculator): void {
    this.calculators.set(calculator.comparison, calculator);
  }

  get(comparison: ComparisonType): ScoreCalculator {
    const calculator = this.calculators.get(comparison);
    if (!calculator) {
      throw new Error(`Score calculator not found: ${comparison}`);
    }
    return calculator;
  }
}
