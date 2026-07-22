import { GameDefinitionConfig } from './game-types';

export interface TargetHuntSelectPlayerActionPayload {
  playerId: string;
}

export interface DraftSelectPlayerActionPayload {
  playerId: string;
  slotCode: string;
}

export type SelectPlayerActionPayload =
  TargetHuntSelectPlayerActionPayload | DraftSelectPlayerActionPayload;

export interface GameSessionState {
  sessionId: string;
  status: string;
  stateVersion: number;
  targetValue: number | null;
  selectionCount: number;
  aggregateValue: number;
  playerMode: string;
  currentTurnParticipantId: string | null;
  selections: Array<{
    playerId: string;
    selectionOrder: number;
    metricValue: number | null;
    playerSnapshot: Record<string, unknown>;
    revealed: boolean;
    slotCode?: string | null;
  }>;
}

export interface ProcessActionInput {
  sessionId: string;
  participantId: string;
  actionId: string;
  actionType: string;
  expectedVersion: number;
  payload: SelectPlayerActionPayload;
}

export interface ProcessActionResult {
  state: GameSessionState;
  eventType: string;
  completed: boolean;
  idempotentReplay: boolean;
}

export interface GameFamilyHandler {
  readonly family: string;
  initializeSession(
    sessionId: string,
    definition: GameDefinitionConfig,
    seed: string,
  ): Promise<{ targetValue: number }>;
  processAction(input: ProcessActionInput): Promise<ProcessActionResult>;
  shouldRevealMetric(definition: GameDefinitionConfig, phase: 'selection' | 'complete'): boolean;
}

export const GAME_FAMILY_HANDLER = Symbol('GAME_FAMILY_HANDLER');
