import {
  GameActionType,
  GameDefinitionConfig,
  GameFamily,
} from '../game-engine/contracts/game-types';

export type PlayerModeCapability = 'SINGLE' | 'MULTIPLAYER' | 'BOTH';

export interface GameCapabilities {
  family: GameFamily;
  requiresScope: boolean;
  selectionCount: number;
  slotBased: boolean;
  hasTarget: boolean;
  supportedActions: GameActionType[];
  playerMode: PlayerModeCapability;
}

export function deriveCapabilitiesFromConfig(
  familyCode: string,
  config: GameDefinitionConfig,
  requiresScope: boolean,
): GameCapabilities {
  const family = config.family ?? (familyCode as GameFamily);

  return {
    family,
    requiresScope,
    selectionCount: config.selectionCount,
    slotBased: family === GameFamily.DRAFT,
    hasTarget: family === GameFamily.TARGET_HUNT,
    supportedActions: [GameActionType.SELECT_PLAYER],
    playerMode: 'BOTH',
  };
}
