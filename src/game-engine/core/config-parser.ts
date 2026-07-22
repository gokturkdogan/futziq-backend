import {
  GameDefinitionConfig,
  GameFamily,
  LineupTemplate,
  TargetConfig,
  TargetGeneratorStrategy,
} from '../contracts/game-types';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';

export type TargetHuntDefinitionConfig = GameDefinitionConfig & {
  family: GameFamily.TARGET_HUNT;
  target?: TargetConfig;
};

export type DraftDefinitionConfig = GameDefinitionConfig & {
  family: GameFamily.DRAFT;
  lineupTemplate: LineupTemplate;
};

export type GameDefinitionConfigUnion = TargetHuntDefinitionConfig | DraftDefinitionConfig;

export function isTargetHuntConfig(
  config: GameDefinitionConfig,
): config is TargetHuntDefinitionConfig {
  return config.family === GameFamily.TARGET_HUNT;
}

export function isDraftConfig(config: GameDefinitionConfig): config is DraftDefinitionConfig {
  return config.family === GameFamily.DRAFT;
}

function validateGameDefinitionConfig(config: GameDefinitionConfig): void {
  if (!config.family || !config.metric || !config.scope) {
    throw new DomainException(ErrorCode.VALIDATION_ERROR, 'Invalid game definition config.');
  }

  if (!Number.isInteger(config.selectionCount) || config.selectionCount < 1) {
    throw new DomainException(
      ErrorCode.VALIDATION_ERROR,
      'selectionCount must be a positive integer.',
    );
  }

  if (isDraftConfig(config)) {
    if (!config.lineupTemplate?.slots?.length) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        'Draft config requires lineupTemplate with slots.',
      );
    }
    if (!config.positionEligibilityPolicy) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        'Draft config requires positionEligibilityPolicy.',
      );
    }
    if (config.lineupTemplate.slots.length !== config.selectionCount) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        'Draft selectionCount must match lineup slot count.',
      );
    }
  }

  if (isTargetHuntConfig(config) && !config.target && config.comparison === undefined) {
    throw new DomainException(
      ErrorCode.VALIDATION_ERROR,
      'Target Hunt config requires target or comparison.',
    );
  }
}

export function parseGameDefinitionConfig(raw: unknown): GameDefinitionConfig {
  const source = { ...(raw as Record<string, unknown>) };
  delete source.__session;
  const config = source as unknown as GameDefinitionConfig;
  validateGameDefinitionConfig(config);
  return config;
}

export function resolveTargetStrategy(config: GameDefinitionConfig): TargetGeneratorStrategy {
  return config.target?.strategy ?? TargetGeneratorStrategy.DATA_DISTRIBUTION;
}
