import {
  advanceDraftRound,
  canAdvanceRound,
  getDraftRoundScopeParams,
  isRoundComplete,
  recordPickInRound,
} from '../src/game-runtime/domain/draft-round';

describe('draft round helpers', () => {
  const baseRound = {
    scopeType: 'CLUB' as const,
    currentRound: 1,
    totalRounds: 6,
    picksInCurrentRound: 0,
    picksPerRound: 2,
    currentEntity: {
      type: 'CLUB' as const,
      id: 'club-1',
      name: 'FC Barcelona',
      logoUrl: 'https://example.com/barca.png',
    },
    usedEntityIds: ['club-1'],
  };

  it('tracks picks within a round', () => {
    const afterFirstPick = recordPickInRound(baseRound);
    expect(afterFirstPick.picksInCurrentRound).toBe(1);
    expect(isRoundComplete(afterFirstPick)).toBe(false);

    const afterSecondPick = recordPickInRound(afterFirstPick);
    expect(afterSecondPick.picksInCurrentRound).toBe(2);
    expect(isRoundComplete(afterSecondPick)).toBe(true);
    expect(canAdvanceRound(afterSecondPick)).toBe(true);
  });

  it('advances to the next round with a new entity', () => {
    const completedRound = recordPickInRound(recordPickInRound(baseRound));
    const nextEntity = {
      type: 'CLUB' as const,
      id: 'club-2',
      name: 'Real Madrid',
      logoUrl: null,
    };

    const advanced = advanceDraftRound(completedRound, nextEntity);
    expect(advanced.currentRound).toBe(2);
    expect(advanced.picksInCurrentRound).toBe(0);
    expect(advanced.currentEntity).toEqual(nextEntity);
    expect(advanced.usedEntityIds).toContain('club-2');
  });

  it('maps scope params for club and country', () => {
    expect(getDraftRoundScopeParams(baseRound)).toEqual({ clubId: 'club-1' });
    expect(
      getDraftRoundScopeParams({
        ...baseRound,
        scopeType: 'COUNTRY',
        currentEntity: { type: 'COUNTRY', id: 'country-1', name: 'Brazil', logoUrl: null },
      }),
    ).toEqual({ countryId: 'country-1' });
  });
});
