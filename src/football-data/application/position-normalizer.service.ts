import { Injectable } from '@nestjs/common';
import {
  LineupSlotDefinition,
  PositionEligibilityPolicy,
  PositionGroup,
} from '../../game-engine/contracts/game-types';
import { PlayerRecord } from '../domain/football-data.repository';

const RAW_TO_GROUPS: Record<string, PositionGroup[]> = {
  Goalkeeper: [PositionGroup.GK],
  'Left-Back': [PositionGroup.LB],
  'Right-Back': [PositionGroup.RB],
  'Centre-Back': [PositionGroup.CB],
  Sweeper: [PositionGroup.CB],
  'Defensive Midfield': [PositionGroup.DM, PositionGroup.CM],
  'Central Midfield': [PositionGroup.CM],
  'Attacking Midfield': [PositionGroup.AM],
  'Left Midfield': [PositionGroup.LM, PositionGroup.LW],
  'Right Midfield': [PositionGroup.RM, PositionGroup.RW],
  'Left Winger': [PositionGroup.LW, PositionGroup.LM],
  'Right Winger': [PositionGroup.RW, PositionGroup.RM],
  'Centre-Forward': [PositionGroup.ST, PositionGroup.CF],
  'Second Striker': [PositionGroup.CF, PositionGroup.ST],
  Defender: [PositionGroup.CB, PositionGroup.LB, PositionGroup.RB],
  Midfield: [PositionGroup.CM, PositionGroup.DM, PositionGroup.AM],
  Attack: [PositionGroup.ST, PositionGroup.CF, PositionGroup.LW, PositionGroup.RW],
};

const GROUP_TO_RAW: Record<PositionGroup, string[]> = {
  [PositionGroup.GK]: ['Goalkeeper'],
  [PositionGroup.LB]: ['Left-Back', 'Defender'],
  [PositionGroup.LWB]: ['Left-Back', 'Left Midfield', 'Left Winger', 'Defender'],
  [PositionGroup.CB]: ['Centre-Back', 'Sweeper', 'Defender'],
  [PositionGroup.RB]: ['Right-Back', 'Defender'],
  [PositionGroup.RWB]: ['Right-Back', 'Right Midfield', 'Right Winger', 'Defender'],
  [PositionGroup.DM]: ['Defensive Midfield', 'Central Midfield', 'Midfield'],
  [PositionGroup.CM]: ['Central Midfield', 'Defensive Midfield', 'Midfield'],
  [PositionGroup.AM]: ['Attacking Midfield', 'Midfield'],
  [PositionGroup.LM]: ['Left Midfield', 'Left Winger', 'Midfield'],
  [PositionGroup.LW]: ['Left Winger', 'Left Midfield', 'Attack'],
  [PositionGroup.RM]: ['Right Midfield', 'Right Winger', 'Midfield'],
  [PositionGroup.RW]: ['Right Winger', 'Right Midfield', 'Attack'],
  [PositionGroup.CF]: ['Centre-Forward', 'Second Striker', 'Attack'],
  [PositionGroup.ST]: ['Centre-Forward', 'Second Striker', 'Attack'],
};

@Injectable()
export class PositionNormalizerService {
  getNormalizedPositions(player: PlayerRecord): PositionGroup[] {
    const positions = new Set<PositionGroup>();
    for (const raw of [player.primaryPosition, player.subPosition]) {
      if (!raw) continue;
      for (const group of RAW_TO_GROUPS[raw] ?? []) {
        positions.add(group);
      }
    }
    return [...positions];
  }

  isEligibleForSlot(
    player: PlayerRecord,
    slot: LineupSlotDefinition,
    policy: PositionEligibilityPolicy,
  ): boolean {
    if (policy === PositionEligibilityPolicy.FREE_POSITION) {
      return true;
    }

    const primaryGroups = new Set<PositionGroup>(
      player.primaryPosition ? (RAW_TO_GROUPS[player.primaryPosition] ?? []) : [],
    );
    const allGroups = new Set(this.getNormalizedPositions(player));

    const candidateGroups =
      policy === PositionEligibilityPolicy.PRIMARY_ONLY ? primaryGroups : allGroups;

    return slot.acceptedPositionGroups.some((group) => candidateGroups.has(group));
  }

  getAllowedRawPositionsForSlot(slot: LineupSlotDefinition): string[] {
    return [...new Set(slot.acceptedPositionGroups.flatMap((group) => GROUP_TO_RAW[group] ?? []))];
  }
}
