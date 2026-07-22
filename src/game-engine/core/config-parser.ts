import { GameDefinitionConfig, TargetGeneratorStrategy } from '../contracts/game-types';

export function parseGameDefinitionConfig(raw: unknown): GameDefinitionConfig {
  const source = { ...(raw as Record<string, unknown>) };
  delete source.__session;
  const config = source as unknown as GameDefinitionConfig;
  if (!config?.family || !config?.metric || !config?.scope) {
    throw new Error('Invalid game definition config');
  }
  return config;
}

export function resolveTargetStrategy(config: GameDefinitionConfig): TargetGeneratorStrategy {
  return config.target?.strategy ?? TargetGeneratorStrategy.DATA_DISTRIBUTION;
}
