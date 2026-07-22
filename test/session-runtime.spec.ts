import {
  buildParticipantExternalIds,
  getCurrentTurnParticipantId,
  getExpectedTurnParticipant,
  isSessionFullyComplete,
  PlayerMode,
} from '../src/game-runtime/domain/session-runtime';

describe('session-runtime', () => {
  const participants = [
    { id: 'p1', turnOrder: 0, selectionCount: 0 },
    { id: 'p2', turnOrder: 1, selectionCount: 0 },
  ];

  it('builds two participant ids for multiplayer', () => {
    expect(buildParticipantExternalIds('host', PlayerMode.MULTIPLAYER)).toEqual([
      'host::p1',
      'host::p2',
    ]);
  });

  it('alternates turns in multiplayer', () => {
    expect(
      getExpectedTurnParticipant(participants, 0, PlayerMode.MULTIPLAYER, 5)?.id,
    ).toBe('p1');
    expect(
      getExpectedTurnParticipant(participants, 1, PlayerMode.MULTIPLAYER, 5)?.id,
    ).toBe('p2');
    expect(
      getExpectedTurnParticipant(participants, 2, PlayerMode.MULTIPLAYER, 5)?.id,
    ).toBe('p1');
  });

  it('completes only when every participant reaches selection limit', () => {
    const active = [
      { id: 'p1', turnOrder: 0, selectionCount: 5 },
      { id: 'p2', turnOrder: 1, selectionCount: 4 },
    ];
    expect(isSessionFullyComplete(active, 5)).toBe(false);

    const done = [
      { id: 'p1', turnOrder: 0, selectionCount: 5 },
      { id: 'p2', turnOrder: 1, selectionCount: 5 },
    ];
    expect(isSessionFullyComplete(done, 5)).toBe(true);
  });

  it('returns null current turn when session is complete', () => {
    const done = [
      { id: 'p1', turnOrder: 0, selectionCount: 5 },
      { id: 'p2', turnOrder: 1, selectionCount: 5 },
    ];
    expect(
      getCurrentTurnParticipantId(done, 10, PlayerMode.MULTIPLAYER, 5),
    ).toBeNull();
  });
});
