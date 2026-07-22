import {
  GameDefinitionConfig,
  GameFamily,
  LineupSlotDefinition,
  PositionGroup,
} from '../../game-engine/contracts/game-types';

export type DraftLineCode = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface DraftLineupSlotView {
  slotCode: string;
  displayName: string;
  line: DraftLineCode;
  occupied: boolean;
  playerId: string | null;
  metricValue: number | null;
  playerSnapshot: Record<string, unknown> | null;
}

export interface DraftSelectionInput {
  playerId: string;
  slotCode?: string | null;
  metricValue: number;
  playerSnapshot: Record<string, unknown>;
}

function resolveLine(slot: LineupSlotDefinition): DraftLineCode {
  if (slot.line) {
    return slot.line;
  }

  if (slot.code === 'GK' || slot.acceptedPositionGroups.includes(PositionGroup.GK)) {
    return 'GK';
  }

  const groups = new Set(slot.acceptedPositionGroups);
  if (
    groups.has(PositionGroup.ST) ||
    groups.has(PositionGroup.CF) ||
    groups.has(PositionGroup.LW) ||
    groups.has(PositionGroup.RW)
  ) {
    return 'ATT';
  }
  if (
    groups.has(PositionGroup.CM) ||
    groups.has(PositionGroup.DM) ||
    groups.has(PositionGroup.AM)
  ) {
    return 'MID';
  }
  if (
    groups.has(PositionGroup.CB) ||
    groups.has(PositionGroup.LB) ||
    groups.has(PositionGroup.RB)
  ) {
    return 'DEF';
  }

  return 'MID';
}

export function buildDraftLineup(
  definition: GameDefinitionConfig,
  selections: DraftSelectionInput[],
): DraftLineupSlotView[] | null {
  if (definition.family !== GameFamily.DRAFT || !definition.lineupTemplate) {
    return null;
  }

  return definition.lineupTemplate.slots.map((slot) => {
    const selection = selections.find((item) => item.slotCode === slot.code);
    return {
      slotCode: slot.code,
      displayName: slot.displayName,
      line: resolveLine(slot),
      occupied: selection != null,
      playerId: selection?.playerId ?? null,
      metricValue: selection?.metricValue ?? null,
      playerSnapshot: selection?.playerSnapshot ?? null,
    };
  });
}
