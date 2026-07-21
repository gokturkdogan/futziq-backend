import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/football-data/infrastructure/prisma.service';
import { GameRuntimeService } from '../src/game-runtime/application/game-runtime.service';
import { v4 as uuidv4 } from 'uuid';

describe('Game Runtime Integration', () => {
  let prisma: PrismaService;
  let runtime: GameRuntimeService;
  const participantId = `integration-${uuidv4()}`;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    prisma = module.get(PrismaService);
    runtime = module.get(GameRuntimeService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates session with immutable snapshot and events', async () => {
    const session = await runtime.createSession(
      {
        familyCode: 'TARGET_HUNT',
        gameCode: 'GOALS',
        scopeCode: 'CAREER',
      },
      participantId,
    );

    expect(session.definitionSnapshot.metric).toBe('CAREER_GOALS');
    expect(session.targetValue).toBeGreaterThan(0);
    expect(session.seed).toBeDefined();

    const events = await runtime.getEvents(session.id, participantId);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventType).toBe('SESSION_STARTED');
  });

  it('rejects duplicate player selection', async () => {
    const session = await runtime.createSession(
      {
        familyCode: 'TARGET_HUNT',
        gameCode: 'GOALS',
        scopeCode: 'CAREER',
      },
      `dup-${uuidv4()}`,
    );

    const search = await runtime.searchPlayers(
      session.id,
      session.participants[0].externalParticipantId,
      'messi',
      1,
      5,
    );
    const playerId = search.items[0]?.id;
    expect(playerId).toBeDefined();

    await runtime.processAction(session.id, session.participants[0].externalParticipantId, {
      actionId: uuidv4(),
      expectedVersion: 0,
      playerId: playerId!,
    });

    await expect(
      runtime.processAction(session.id, session.participants[0].externalParticipantId, {
        actionId: uuidv4(),
        expectedVersion: 1,
        playerId: playerId!,
      }),
    ).rejects.toMatchObject({ code: 'PLAYER_ALREADY_SELECTED' });
  });

  it('rejects action on version conflict', async () => {
    const session = await runtime.createSession(
      {
        familyCode: 'TARGET_HUNT',
        gameCode: 'GOALS',
        scopeCode: 'CAREER',
      },
      `conflict-${uuidv4()}`,
    );

    const search = await runtime.searchPlayers(
      session.id,
      session.participants[0].externalParticipantId,
      'ron',
      1,
      10,
    );
    const player = search.items[0];
    expect(player).toBeDefined();

    await expect(
      runtime.processAction(session.id, session.participants[0].externalParticipantId, {
        actionId: uuidv4(),
        expectedVersion: 99,
        playerId: player!.id,
      }),
    ).rejects.toMatchObject({ code: 'STATE_VERSION_CONFLICT' });
  });

  it('supports Draft slot-aware search and selection', async () => {
    const session = await runtime.createSession(
      {
        familyCode: 'DRAFT',
        gameCode: 'TALLEST_XI',
      },
      `draft-${uuidv4()}`,
    );
    const participant = session.participants[0].externalParticipantId;

    const search = await runtime.searchPlayers(session.id, participant, 'an', 1, 20, 'GK');
    expect(search.items.length).toBeGreaterThan(0);
    expect(search.items[0].normalizedPositions.length).toBeGreaterThan(0);

    const action = await runtime.processAction(session.id, participant, {
      actionId: uuidv4(),
      expectedVersion: 0,
      playerId: search.items[0].id,
      slotCode: 'GK',
    });

    expect(action.state.selectionCount).toBe(1);
    expect(action.state.selections[0].slotCode).toBe('GK');
  });
});
