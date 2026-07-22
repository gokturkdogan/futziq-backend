import {
  DEFAULT_DRAFT_CONFIG,
  FORMATION_1_2_2_1,
  GameFamily,
  ObjectiveType,
} from '../src/game-engine/contracts/game-types';
import { buildDraftLineup } from '../src/game-runtime/domain/draft-lineup';

describe('draft lineup', () => {
  it('builds six-slot lineup state from selections', () => {
    const lineup = buildDraftLineup(DEFAULT_DRAFT_CONFIG, [
      {
        playerId: 'p1',
        slotCode: 'GK',
        metricValue: 190,
        playerSnapshot: { displayName: 'Keeper' },
      },
      {
        playerId: 'p2',
        slotCode: 'DEF1',
        metricValue: 185,
        playerSnapshot: { displayName: 'Defender 1' },
      },
    ]);

    expect(lineup).toHaveLength(6);
    expect(lineup?.[0]).toMatchObject({
      slotCode: 'GK',
      line: 'GK',
      occupied: true,
      playerId: 'p1',
    });
    expect(lineup?.[1]).toMatchObject({
      slotCode: 'DEF1',
      line: 'DEF',
      occupied: true,
    });
    expect(lineup?.[5]).toMatchObject({
      slotCode: 'ATT',
      line: 'ATT',
      occupied: false,
    });
  });

  it('uses the current default draft formation', () => {
    expect(DEFAULT_DRAFT_CONFIG.selectionCount).toBe(6);
    expect(DEFAULT_DRAFT_CONFIG.lineupTemplate).toEqual(FORMATION_1_2_2_1);
    expect(DEFAULT_DRAFT_CONFIG.family).toBe(GameFamily.DRAFT);
    expect(DEFAULT_DRAFT_CONFIG.objective).toBe(ObjectiveType.MAX);
  });
});
