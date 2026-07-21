import { GameDefinitionConfig, TargetGeneratorStrategy } from '../contracts/game-types';

export function parseGameDefinitionConfig(raw: unknown): GameDefinitionConfig {
  const config = raw as GameDefinitionConfig;
  if (!config?.family || !config?.metric || !config?.scope) {
    throw new Error('Invalid game definition config');
  }
  return config;
}

export function resolveTargetStrategy(config: GameDefinitionConfig): TargetGeneratorStrategy {
  return config.target?.strategy ?? TargetGeneratorStrategy.DATA_DISTRIBUTION;
}
