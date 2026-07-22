import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/errors/global-exception.filter';

describe('Target Hunt E2E', () => {
  let app: INestApplication;
  const participantId = 'e2e-test-participant';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists game families for categories page', async () => {
    const familiesRes = await request(app.getHttpServer())
      .get('/api/v1/game-families')
      .expect(200);

    expect(familiesRes.body.length).toBeGreaterThanOrEqual(2);
    expect(familiesRes.body[0].imageUrl).toBeTruthy();

    const detailRes = await request(app.getHttpServer())
      .get('/api/v1/game-families/TARGET_HUNT')
      .expect(200);

    expect(detailRes.body.code).toBe('TARGET_HUNT');
    expect(detailRes.body.games.length).toBeGreaterThan(0);
    expect(detailRes.body.games[0].requiresScope).toBe(true);
    expect(detailRes.body.games[0].scopes?.length).toBeGreaterThan(0);
    expect(detailRes.body.games[0].imageUrl).toBeTruthy();
    expect(detailRes.body.games[0].bannerImageUrl).toBeTruthy();

    const draftRes = await request(app.getHttpServer())
      .get('/api/v1/game-families/DRAFT')
      .expect(200);

    expect(draftRes.body.games.length).toBeGreaterThan(0);
    expect(draftRes.body.games[0].requiresScope).toBe(false);
    expect(draftRes.body.games[0].scopes).toBeNull();
  });

  it('completes full Target Hunt flow', async () => {
    const sessionRes = await request(app.getHttpServer())
      .post('/api/v1/game-sessions')
      .set('X-Participant-Id', participantId)
      .send({
        familyCode: 'TARGET_HUNT',
        gameCode: 'GOALS',
        scopeCode: 'CAREER',
      })
      .expect(201);

    const sessionId = sessionRes.body.id;
    expect(sessionRes.body.targetValue).toBeGreaterThan(0);
    expect(sessionRes.body.status).toBe('IN_PROGRESS');

    const searchRes = await request(app.getHttpServer())
      .get(`/api/v1/game-sessions/${sessionId}/players`)
      .set('X-Participant-Id', participantId)
      .query({ q: 'ron', page: 1, limit: 10 })
      .expect(200);

    expect(searchRes.body.items.length).toBeGreaterThan(0);

    const playerIds: string[] = [];
    const queries = ['mes', 'cri', 'ney', 'mull', 'kane'];

    for (const q of queries) {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/game-sessions/${sessionId}/players`)
        .set('X-Participant-Id', participantId)
        .query({ q, page: 1, limit: 5 })
        .expect(200);
      const candidate = res.body.items.find((p: { id: string }) => !playerIds.includes(p.id));
      if (candidate) playerIds.push(candidate.id);
    }

    while (playerIds.length < 5) {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/game-sessions/${sessionId}/players`)
        .set('X-Participant-Id', participantId)
        .query({ q: 'a', page: 1, limit: 20 })
        .expect(200);
      for (const item of res.body.items) {
        if (!playerIds.includes(item.id)) {
          playerIds.push(item.id);
          if (playerIds.length >= 5) break;
        }
      }
      break;
    }

    expect(playerIds.length).toBeGreaterThanOrEqual(5);

    let version = 0;
    for (let i = 0; i < 5; i++) {
      const actionRes = await request(app.getHttpServer())
        .post(`/api/v1/game-sessions/${sessionId}/actions`)
        .set('X-Participant-Id', participantId)
        .send({
          actionId: uuidv4(),
          expectedVersion: version,
          playerId: playerIds[i],
        })
        .expect(201);

      version = actionRes.body.state.stateVersion;
    }

    const session = await request(app.getHttpServer())
      .get(`/api/v1/game-sessions/${sessionId}`)
      .set('X-Participant-Id', participantId)
      .expect(200);

    expect(session.body.status).toBe('COMPLETED');
    expect(session.body.selections.length).toBe(5);

    const result = await request(app.getHttpServer())
      .get(`/api/v1/game-sessions/${sessionId}/result`)
      .set('X-Participant-Id', participantId)
      .expect(200);

    expect(result.body.selectionCount).toBe(5);
    expect(result.body.performanceRating).toBeDefined();
    expect(result.body.absoluteDifference).toBeGreaterThanOrEqual(0);
  }, 60000);

  it('supports Draft slot-based flow', async () => {
    const participant = `draft-e2e-${uuidv4()}`;
    const sessionRes = await request(app.getHttpServer())
      .post('/api/v1/game-sessions')
      .set('X-Participant-Id', participant)
      .send({
        familyCode: 'DRAFT',
        gameCode: 'TALLEST_XI',
      })
      .expect(201);

    const sessionId = sessionRes.body.id;
    const slots = ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'RCM', 'LW', 'CAM', 'RW', 'ST'];
    const queries = ['an', 'ma', 'ri', 'al', 'er'];

    let version = 0;
    const selected = new Set<string>();

    for (const slotCode of slots) {
      let playerId: string | undefined;
      for (const q of queries) {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/game-sessions/${sessionId}/players`)
          .set('X-Participant-Id', participant)
          .query({ q, page: 1, limit: 20, slotCode })
          .expect(200);
        const candidate = res.body.items.find((item: { id: string }) => !selected.has(item.id));
        if (candidate) {
          playerId = candidate.id;
          break;
        }
      }

      expect(playerId).toBeDefined();
      selected.add(playerId!);

      const actionRes = await request(app.getHttpServer())
        .post(`/api/v1/game-sessions/${sessionId}/actions`)
        .set('X-Participant-Id', participant)
        .send({
          actionId: uuidv4(),
          expectedVersion: version,
          playerId,
          slotCode,
        })
        .expect(201);

      version = actionRes.body.state.stateVersion;
    }

    const result = await request(app.getHttpServer())
      .get(`/api/v1/game-sessions/${sessionId}/result`)
      .set('X-Participant-Id', participant)
      .expect(200);

    expect(result.body.selectionCount).toBe(11);
    expect(result.body.aggregateValue).toBeGreaterThan(1500);
    expect(result.body.selections.every((item: { slotCode?: string }) => item.slotCode)).toBe(true);
  }, 90000);
});
