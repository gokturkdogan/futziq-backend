import { Injectable } from '@nestjs/common';
import { TargetGenerator } from '../contracts/target-generator';

@Injectable()
export class TargetGeneratorRegistry {
  private readonly generators = new Map<string, TargetGenerator>();

  register(generator: TargetGenerator): void {
    this.generators.set(generator.strategy, generator);
  }

  get(strategy: string): TargetGenerator {
    const generator = this.generators.get(strategy);
    if (!generator) {
      throw new Error(`Target generator not found: ${strategy}`);
    }
    return generator;
  }
}
