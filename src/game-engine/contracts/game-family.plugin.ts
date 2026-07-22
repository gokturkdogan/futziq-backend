import {
  GameActionType,
  GameDefinitionConfig,
  GameFamily,
} from './game-types';
import { GameCapabilities } from '../../client-contract/capabilities';

export interface SelectionValidationContext {
  sessionId: string;
  participantId: string;
  playerId: string;
  slotCode?: string;
  definition: GameDefinitionConfig;
  selectedPlayerIds: string[];
  existingSelections: Array<{
    playerId: string;
    selectionOrder: number;
    slotCode?: string | null;
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }>;
  isPlayerSelectedInSession: (playerId: string) => Promise<boolean>;
}

export interface CompletionContext {
  targetValue: number;
  aggregateValue: number;
  definition: GameDefinitionConfig;
  selections: Array<{
    playerId: string;
    selectionOrder: number;
    slotCode?: string | null;
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }>;
  startedAt: Date | null;
  completedAt: Date;
}

export interface CompletionResult {
  targetValue: number;
  aggregateValue: number;
  absoluteDifference: number;
  exactHit: boolean;
  performanceRating: string;
  resultPayload: Record<string, unknown>;
}

export interface GameFamilyPlugin {
  readonly family: GameFamily;
  readonly capabilities: GameCapabilities;
  readonly supportedActions: GameActionType[];
  initializeSession(
    sessionId: string,
    definition: GameDefinitionConfig,
    seed: string,
  ): Promise<{ targetValue: number }>;
  shouldRevealMetric(definition: GameDefinitionConfig, phase: 'selection' | 'complete'): boolean;
  validateSelection(
    ctx: SelectionValidationContext,
  ): Promise<{ metricValue: number; playerSnapshot: Record<string, unknown> }>;
  buildCompletion(ctx: CompletionContext): Promise<CompletionResult>;
}

export const GAME_FAMILY_PLUGIN = Symbol('GAME_FAMILY_PLUGIN');
