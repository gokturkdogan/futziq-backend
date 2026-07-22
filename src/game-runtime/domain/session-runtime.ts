import { GameDefinitionConfig } from '../../game-engine/contracts/game-types';
import { DraftRoundRuntime } from './draft-round';

export enum PlayerMode {
  SINGLE = 'SINGLE',
  MULTIPLAYER = 'MULTIPLAYER',
}

export const MULTIPLAYER_PLAYER_COUNT = 2;

export interface SessionRuntimeMeta {
  playerMode: PlayerMode;
  draftRound?: DraftRoundRuntime;
}

type SnapshotWithRuntime = GameDefinitionConfig & {
  __session?: SessionRuntimeMeta;
};

export function encodeDefinitionSnapshot(
  config: GameDefinitionConfig,
  runtime: SessionRuntimeMeta,
): SnapshotWithRuntime {
  return {
    ...config,
    __session: runtime,
  };
}

export function parseSessionRuntime(snapshot: unknown): SessionRuntimeMeta {
  const raw = snapshot as SnapshotWithRuntime;
  const playerMode = raw.__session?.playerMode ?? PlayerMode.SINGLE;
  return {
    playerMode: playerMode === PlayerMode.MULTIPLAYER ? PlayerMode.MULTIPLAYER : PlayerMode.SINGLE,
    draftRound: raw.__session?.draftRound,
  };
}

export function buildParticipantExternalIds(
  hostParticipantId: string,
  playerMode: PlayerMode,
): string[] {
  if (playerMode === PlayerMode.MULTIPLAYER) {
    return [
      `${hostParticipantId}::p1`,
      `${hostParticipantId}::p2`,
    ];
  }
  return [hostParticipantId];
}

export function canAccessSession(
  participants: Array<{ externalParticipantId: string }>,
  externalParticipantId: string,
): boolean {
  if (participants.some((participant) => participant.externalParticipantId === externalParticipantId)) {
    return true;
  }

  const hostPrefix = `${externalParticipantId}::`;
  return participants.some((participant) => participant.externalParticipantId.startsWith(hostPrefix));
}

export function getExpectedTurnParticipant<
  T extends { id: string; turnOrder: number; selectionCount: number },
>(participants: T[], totalSelections: number, playerMode: PlayerMode, selectionLimit: number): T | null {
  if (playerMode !== PlayerMode.MULTIPLAYER) {
    return participants[0] ?? null;
  }

  const sorted = [...participants].sort((left, right) => left.turnOrder - right.turnOrder);
  const activeParticipants = sorted.filter((participant) => participant.selectionCount < selectionLimit);
  if (activeParticipants.length === 0) {
    return null;
  }

  const expectedTurnOrder = totalSelections % MULTIPLAYER_PLAYER_COUNT;
  const expectedParticipant = sorted.find((participant) => participant.turnOrder === expectedTurnOrder);
  if (expectedParticipant && expectedParticipant.selectionCount < selectionLimit) {
    return expectedParticipant;
  }

  return activeParticipants[0] ?? null;
}

export function getCurrentTurnParticipantId<
  T extends { id: string; turnOrder: number; selectionCount: number },
>(
  participants: T[],
  totalSelections: number,
  playerMode: PlayerMode,
  selectionLimit: number,
): string | null {
  return getExpectedTurnParticipant(participants, totalSelections, playerMode, selectionLimit)?.id ?? null;
}

export function isSessionFullyComplete<
  T extends { id: string; selectionCount: number },
>(
  participants: T[],
  selectionLimit: number,
  pendingSelectionCounts?: Map<string, number>,
): boolean {
  return participants.every((participant) => {
    const selectionCount = pendingSelectionCounts?.get(participant.id) ?? participant.selectionCount;
    return selectionCount >= selectionLimit;
  });
}
