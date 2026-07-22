import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../football-data/infrastructure/prisma.service';
import {
  GameEventType,
  ObjectiveType,
  RevealPolicy,
  type LineupTemplate,
} from '../../game-engine/contracts/game-types';
import { parseGameDefinitionConfig } from '../../game-engine/core/config-parser';
import {
  CreateSessionInput,
  GameResultView,
  GameSessionRepository,
  GameSessionView,
} from '../domain/game-session.repository';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { GameFamilyPluginRegistry } from '../../game-engine/registries/game-family-plugin.registry';
import { v4 as uuidv4 } from 'uuid';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';
import {
  GAME_CATALOG_REPOSITORY,
  GameCatalogRepository,
} from '../../game-catalog/domain/game-catalog.repository';
import { LocalizedConfigService } from '../../game-catalog/application/localized-config.service';
import {
  buildParticipantExternalIds,
  canAccessSession,
  encodeDefinitionSnapshot,
  getCurrentTurnParticipantId,
  parseSessionRuntime,
  PlayerMode,
} from '../domain/session-runtime';
import { buildDraftLineup, type DraftLineupSlotView } from '../domain/draft-lineup';

const GAME_SESSION_VIEW_INCLUDE = {
  participants: true,
  selections: true,
  scope: { select: { code: true } },
} as const;

@Injectable()
export class PrismaGameSessionRepository implements GameSessionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginRegistry: GameFamilyPluginRegistry,
    @Inject(GAME_CATALOG_REPOSITORY)
    private readonly catalogRepository: GameCatalogRepository,
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
    private readonly localizedConfig: LocalizedConfigService,
  ) {}

  async createSession(input: CreateSessionInput): Promise<GameSessionView> {
    const resolved = await this.catalogRepository.resolvePlayConfig({
      familyCode: input.familyCode,
      gameCode: input.gameCode,
      scopeCode: input.scopeCode,
    });

    if (!resolved) {
      const game = await this.prisma.game.findFirst({
        where: {
          code: input.gameCode,
          family: { code: input.familyCode },
        },
        select: { requiresScope: true },
      });

      if (!game) {
        throw new DomainException(
          ErrorCode.GAME_NOT_FOUND,
          `Game not found: ${input.familyCode}/${input.gameCode}`,
        );
      }

      if (game.requiresScope && !input.scopeCode) {
        throw new DomainException(
          ErrorCode.GAME_SCOPE_REQUIRED,
          'Scope selection is required for this game.',
          { familyCode: input.familyCode, gameCode: input.gameCode },
        );
      }

      throw new DomainException(
        ErrorCode.INVALID_GAME_SCOPE_COMBINATION,
        'Selected scope is not available for this game.',
        {
          familyCode: input.familyCode,
          gameCode: input.gameCode,
          scopeCode: input.scopeCode ?? null,
        },
      );
    }

    const config = parseGameDefinitionConfig(resolved.config);
    const playerMode = input.playerMode ?? PlayerMode.SINGLE;
    const seed = uuidv4();
    const handler = this.pluginRegistry.get(config.family);
    const sessionId = uuidv4();
    const participantExternalIds = buildParticipantExternalIds(input.externalParticipantId, playerMode);

    const targetValue =
      input.targetValue != null
        ? input.targetValue
        : (await handler.initializeSession(sessionId, config, seed)).targetValue;
    const expiresAt = new Date(Date.now() + input.sessionExpiryHours * 60 * 60 * 1000);

    const session = await this.prisma.gameSession.create({
      data: {
        id: sessionId,
        gameId: resolved.gameId,
        scopeId: resolved.scopeId,
        gameScopeRuleId: resolved.gameScopeRuleId,
        definitionSnapshot: encodeDefinitionSnapshot(config, { playerMode }) as object,
        status: 'IN_PROGRESS',
        seed,
        targetValue,
        stateVersion: 0,
        startedAt: new Date(),
        expiresAt,
        participants: {
          create: participantExternalIds.map((externalParticipantId, index) => ({
            externalParticipantId,
            turnOrder: index,
            status: 'ACTIVE',
          })),
        },
        events: {
          create: {
            sequence: 1,
            eventType: GameEventType.SESSION_STARTED,
            payload: {
              targetGenerated: input.targetValue == null,
              targetFixed: input.targetValue != null,
              familyCode: resolved.familyCode,
              gameCode: resolved.gameCode,
              scopeCode: resolved.scopeCode,
              playerMode,
            },
          },
        },
      },
      include: GAME_SESSION_VIEW_INCLUDE,
    });

    return this.toView(session, 'en');
  }

  async getSession(sessionId: string, locale = 'en'): Promise<GameSessionView | null> {
    return this.getSessionView(sessionId, locale);
  }

  async getSessionForParticipant(
    sessionId: string,
    externalParticipantId: string,
    locale = 'en',
  ): Promise<GameSessionView | null> {
    const session = await this.getSessionView(sessionId, locale);
    if (!session) return null;
    const belongs = canAccessSession(session.participants, externalParticipantId);
    return belongs ? session : null;
  }

  async getSessionView(sessionId: string, locale = 'en'): Promise<GameSessionView | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: GAME_SESSION_VIEW_INCLUDE,
    });
    return session ? this.toView(session, locale) : null;
  }

  buildActionState(sessionId: string, participantId: string, locale = 'en') {
    return this.buildState(sessionId, participantId, locale);
  }
  async getEvents(sessionId: string) {
    const events = await this.prisma.gameEvent.findMany({
      where: { gameSessionId: sessionId },
      orderBy: { sequence: 'asc' },
    });
    return events.map((e) => ({
      id: e.id,
      sequence: e.sequence,
      eventType: e.eventType,
      participantId: e.participantId,
      payload: e.payload as Record<string, unknown>,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async getResult(
    sessionId: string,
    externalParticipantId: string,
    locale = 'en',
  ): Promise<GameResultView | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { participants: true, selections: true, results: true },
    });
    if (!session) return null;

    if (!canAccessSession(session.participants, externalParticipantId)) {
      return null;
    }

    const participant = session.participants.find(
      (p) => p.externalParticipantId === externalParticipantId,
    );
    if (!participant) {
      return null;
    }

    const result = session.results.find((r) => r.participantId === participant.id);
    if (!result) return null;

    return this.toResultView(session, participant, result, locale);
  }

  async getResults(
    sessionId: string,
    externalParticipantId: string,
    locale = 'en',
  ): Promise<GameResultView[]> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { participants: true, selections: true, results: true },
    });
    if (!session) return [];

    if (!canAccessSession(session.participants, externalParticipantId)) {
      return [];
    }

    return session.participants
      .map((participant) => {
        const result = session.results.find((entry) => entry.participantId === participant.id);
        if (!result) return null;
        return this.toResultView(session, participant, result, locale);
      })
      .filter((result): result is GameResultView => result !== null)
      .sort((left, right) => {
        const leftParticipant = session.participants.find((p) => p.id === left.participantId);
        const rightParticipant = session.participants.find((p) => p.id === right.participantId);
        return (leftParticipant?.turnOrder ?? 0) - (rightParticipant?.turnOrder ?? 0);
      });
  }

  private toResultView(
    session: {
      id: string;
      status: string;
      definitionSnapshot: unknown;
      participants: Array<{ id: string; selectionCount: number }>;
    },
    participant: { id: string; selectionCount: number },
    result: {
      id: string;
      targetValue: number;
      aggregateValue: number;
      absoluteDifference: number;
      exactHit: boolean;
      performanceRating: string;
      resultPayload: unknown;
    },
    locale = 'en',
  ): GameResultView {
    const payload = result.resultPayload as {
      selections?: Array<{
        playerId: string;
        selectionOrder: number;
        slotCode?: string | null;
        metricValue: number;
        playerSnapshot: Record<string, unknown>;
      }>;
      durationMs?: number;
      selectionCount?: number;
      objective?: ObjectiveType;
      lineupTemplate?: LineupTemplate;
      lineup?: DraftLineupSlotView[];
      totalMetricValue?: number;
      averageMetricValue?: number;
    };

    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    const lineup = this.localizeLineup(payload.lineup ?? null, definition, locale);

    return {
      id: result.id,
      sessionId: session.id,
      participantId: participant.id,
      targetValue: result.targetValue,
      aggregateValue: result.aggregateValue,
      absoluteDifference: result.absoluteDifference,
      exactHit: result.exactHit,
      performanceRating: result.performanceRating,
      selectionCount: payload.selectionCount ?? participant.selectionCount,
      selections: payload.selections ?? [],
      durationMs: payload.durationMs ?? 0,
      sessionStatus: session.status,
      resultStatus: session.status === 'COMPLETED' ? 'FINAL' : 'PENDING',
      objective: payload.objective ?? null,
      lineupTemplate: payload.lineupTemplate ?? null,
      lineup,
      totalMetricValue: payload.totalMetricValue ?? result.aggregateValue,
      averageMetricValue: payload.averageMetricValue ?? null,
    };
  }

  private readSlotCode(
    selection: { slotCode?: string | null; playerSnapshot: unknown },
  ): string | null {
    if (selection.slotCode) {
      return selection.slotCode;
    }
    const fromSnapshot = (selection.playerSnapshot as Record<string, unknown>).slotCode;
    return typeof fromSnapshot === 'string' ? fromSnapshot : null;
  }

  private localizeLineup(
    lineup: DraftLineupSlotView[] | null,
    definition: ReturnType<typeof parseGameDefinitionConfig>,
    locale: string,
  ): DraftLineupSlotView[] | null {
    if (!lineup || !definition.lineupTemplate) {
      return lineup;
    }
    const localizedTemplate = this.localizedConfig.localizeLineupTemplate(
      definition.lineupTemplate,
      locale,
    );
    const displayNames = new Map(
      localizedTemplate.slots.map((slot) => [slot.code, slot.displayName]),
    );
    return lineup.map((slot) => ({
      ...slot,
      displayName: displayNames.get(slot.slotCode) ?? slot.displayName,
    }));
  }

  private mapParticipantSelections(
    participantId: string,
    selections: Array<{
      participantId: string;
      playerId: string;
      slotCode?: string | null;
      metricValueSnapshot: number;
      playerSnapshot: unknown;
    }>,
    revealImmediate: boolean,
  ) {
    return selections
      .filter((selection) => selection.participantId === participantId)
      .map((selection) => ({
        playerId: selection.playerId,
        slotCode: this.readSlotCode(selection),
        metricValue: revealImmediate ? selection.metricValueSnapshot : 0,
        playerSnapshot: selection.playerSnapshot as Record<string, unknown>,
      }));
  }

  private buildParticipantLineup(
    definition: ReturnType<typeof parseGameDefinitionConfig>,
    participantId: string,
    selections: Array<{
      participantId: string;
      playerId: string;
      slotCode?: string | null;
      metricValueSnapshot: number;
      playerSnapshot: unknown;
    }>,
    revealImmediate: boolean,
    locale: string,
  ) {
    const lineup = buildDraftLineup(
      definition,
      this.mapParticipantSelections(participantId, selections, revealImmediate),
    );
    return this.localizeLineup(lineup, definition, locale);
  }

  async getPlayerSnapshot(playerId: string): Promise<Record<string, unknown> | null> {
    const player = await this.footballData.findById(playerId);
    if (!player) return null;
    return {
      id: player.id,
      displayName: player.displayName,
      firstName: player.firstName,
      lastName: player.lastName,
      primaryPosition: player.primaryPosition,
      subPosition: player.subPosition,
      heightCm: player.heightCm,
      isActive: player.isActive,
    };
  }

  async isPlayerSelectedInSession(sessionId: string, playerId: string): Promise<boolean> {
    const count = await this.prisma.gameSelection.count({
      where: { gameSessionId: sessionId, playerId },
    });
    return count > 0;
  }

  private async buildState(sessionId: string, participantId: string, locale = 'en') {
    const session = await this.prisma.gameSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { participants: true, selections: true },
    });
    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    const runtime = parseSessionRuntime(session.definitionSnapshot);
    const participant = session.participants.find((p) => p.id === participantId);
    const revealImmediate = definition.revealPolicy === RevealPolicy.IMMEDIATE;

    return {
      sessionId: session.id,
      status: session.status,
      stateVersion: session.stateVersion,
      targetValue: session.status === 'COMPLETED' ? session.targetValue : session.targetValue,
      selectionCount: participant?.selectionCount ?? 0,
      aggregateValue: participant?.aggregateValue ?? 0,
      playerMode: runtime.playerMode,
      currentTurnParticipantId: getCurrentTurnParticipantId(
        session.participants,
        session.selections.length,
        runtime.playerMode,
        definition.selectionCount,
      ),
      lineup: participant
        ? this.buildParticipantLineup(
            definition,
            participant.id,
            session.selections,
            revealImmediate,
            locale,
          )
        : null,
      selections: session.selections
        .filter((s) => s.participantId === participantId)
        .map((s) => ({
          playerId: s.playerId,
          selectionOrder: s.selectionOrder,
          slotCode: this.readSlotCode(s),
          metricValue: revealImmediate ? s.metricValueSnapshot : null,
          playerSnapshot: s.playerSnapshot as Record<string, unknown>,
          revealed: revealImmediate,
        })),
    };
  }

  private toView(session: {
    id: string;
    status: string;
    stateVersion: number;
    targetValue: number | null;
    seed: string;
    definitionSnapshot: unknown;
    startedAt: Date | null;
    completedAt: Date | null;
    expiresAt: Date | null;
    scope?: { code: string } | null;
    participants: Array<{
      id: string;
      externalParticipantId: string;
      turnOrder: number;
      status: string;
      aggregateValue: number;
      selectionCount: number;
    }>;
    selections: Array<{
      id: string;
      participantId: string;
      playerId: string;
      selectionOrder: number;
      slotCode?: string | null;
      metricCode: string;
      metricValueSnapshot: number;
      playerSnapshot: unknown;
    }>;
  }, locale = 'en'): GameSessionView {
    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    const runtime = parseSessionRuntime(session.definitionSnapshot);
    const revealImmediate = definition.revealPolicy === RevealPolicy.IMMEDIATE;

    return {
      id: session.id,
      status: session.status,
      stateVersion: session.stateVersion,
      targetValue: session.targetValue,
      seed: session.seed,
      scopeCode: session.scope?.code ?? null,
      definitionSnapshot: definition,
      playerMode: runtime.playerMode,
      currentTurnParticipantId: getCurrentTurnParticipantId(
        session.participants,
        session.selections.length,
        runtime.playerMode,
        definition.selectionCount,
      ),
      startedAt: session.startedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      participants: session.participants.map((p) => ({
        id: p.id,
        externalParticipantId: p.externalParticipantId,
        turnOrder: p.turnOrder,
        status: p.status,
        aggregateValue: p.aggregateValue,
        selectionCount: p.selectionCount,
        lineup: this.buildParticipantLineup(
          definition,
          p.id,
          session.selections,
          revealImmediate,
          locale,
        ),
      })),
      selections: session.selections.map((s) => ({
        id: s.id,
        participantId: s.participantId,
        playerId: s.playerId,
        selectionOrder: s.selectionOrder,
        slotCode: this.readSlotCode(s),
        metricCode: s.metricCode,
        metricValueSnapshot: revealImmediate ? s.metricValueSnapshot : 0,
        playerSnapshot: s.playerSnapshot as Record<string, unknown>,
        revealed: revealImmediate,
      })),
    };
  }
}
