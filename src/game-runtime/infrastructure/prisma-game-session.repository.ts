import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../football-data/infrastructure/prisma.service';
import {
  GameActionType,
  GameEventType,
  RevealPolicy,
} from '../../game-engine/contracts/game-types';
import { parseGameDefinitionConfig } from '../../game-engine/core/config-parser';
import {
  CreateSessionInput,
  GameResultView,
  GameSessionRepository,
  GameSessionView,
} from '../domain/game-session.repository';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import {
  ProcessActionInput,
  ProcessActionResult,
} from '../../game-engine/contracts/game-family-handler';
import { GameFamilyRegistry } from '../../game-engine/registries/game-family.registry';
import { v4 as uuidv4 } from 'uuid';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';
import { Inject } from '@nestjs/common';
import {
  GAME_CATALOG_REPOSITORY,
  GameCatalogRepository,
} from '../../game-catalog/domain/game-catalog.repository';
import {
  buildParticipantExternalIds,
  canAccessSession,
  encodeDefinitionSnapshot,
  getCurrentTurnParticipantId,
  getExpectedTurnParticipant,
  isSessionFullyComplete,
  parseSessionRuntime,
  PlayerMode,
} from '../domain/session-runtime';

const GAME_SESSION_VIEW_INCLUDE = {
  participants: true,
  selections: true,
  scope: { select: { code: true } },
} as const;

@Injectable()
export class PrismaGameSessionRepository implements GameSessionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameFamilyRegistry: GameFamilyRegistry,
    @Inject(GAME_CATALOG_REPOSITORY)
    private readonly catalogRepository: GameCatalogRepository,
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
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
    const handler = this.gameFamilyRegistry.get(config.family);
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

    return this.toView(session);
  }

  async getSession(sessionId: string): Promise<GameSessionView | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: GAME_SESSION_VIEW_INCLUDE,
    });
    return session ? this.toView(session) : null;
  }

  async getSessionForParticipant(
    sessionId: string,
    externalParticipantId: string,
  ): Promise<GameSessionView | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    const belongs = canAccessSession(session.participants, externalParticipantId);
    return belongs ? session : null;
  }

  async processSelectPlayerAction(
    input: ProcessActionInput,
    hooks: Parameters<GameSessionRepository['processSelectPlayerAction']>[1],
  ): Promise<ProcessActionResult> {
    const existing = await this.prisma.gameAction.findFirst({
      where: {
        gameSessionId: input.sessionId,
        actionId: input.actionId,
      },
    });

    if (existing?.processedAt) {
      const state = await this.buildState(input.sessionId, input.participantId);
      return {
        state,
        eventType: GameEventType.PLAYER_SELECTED,
        completed: state.status === 'COMPLETED',
        idempotentReplay: true,
      };
    }

    const session = await this.prisma.gameSession.findUnique({
      where: { id: input.sessionId },
      include: { participants: true, selections: true },
    });

    if (!session) {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_FOUND, 'Game session not found.');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_ACTIVE, 'Game session is not active.', {
        status: session.status,
      });
    }

    if (session.stateVersion !== input.expectedVersion) {
      throw new DomainException(
        ErrorCode.STATE_VERSION_CONFLICT,
        'State version conflict. Refresh and retry.',
        { expected: input.expectedVersion, actual: session.stateVersion },
      );
    }

    const participant = session.participants.find((p) => p.id === input.participantId);
    if (!participant) {
      throw new DomainException(ErrorCode.INVALID_GAME_ACTION, 'Participant not found in session.');
    }

    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    const runtime = parseSessionRuntime(session.definitionSnapshot);
    const expectedParticipant = getExpectedTurnParticipant(
      session.participants,
      session.selections.length,
      runtime.playerMode,
      definition.selectionCount,
    );

    if (runtime.playerMode === PlayerMode.MULTIPLAYER) {
      if (!expectedParticipant || expectedParticipant.id !== participant.id) {
        throw new DomainException(
          ErrorCode.NOT_YOUR_TURN,
          'It is not this participant turn.',
          {
            currentTurnParticipantId: expectedParticipant?.id ?? null,
          },
        );
      }
    }

    if (participant.selectionCount >= definition.selectionCount) {
      throw new DomainException(
        ErrorCode.SELECTION_LIMIT_REACHED,
        'Selection limit reached for this participant.',
      );
    }

    if (
      runtime.playerMode === PlayerMode.MULTIPLAYER &&
      (await this.isPlayerSelectedInSession(input.sessionId, input.payload.playerId))
    ) {
      throw new DomainException(
        ErrorCode.PLAYER_ALREADY_SELECTED,
        'Player has already been selected in this session.',
        { playerId: input.payload.playerId },
      );
    }

    const selectedPlayerIds = session.selections
      .filter((s) => s.participantId === participant.id)
      .map((s) => s.playerId);
    const existingSelections = session.selections
      .filter((s) => s.participantId === participant.id)
      .map((s) => ({
        playerId: s.playerId,
        selectionOrder: s.selectionOrder,
        slotCode:
          ((s.playerSnapshot as Record<string, unknown>).slotCode as string | undefined) ?? null,
        metricValue: s.metricValueSnapshot,
        playerSnapshot: s.playerSnapshot as Record<string, unknown>,
      }));

    const { metricValue, playerSnapshot } = await hooks.validateAndResolve({
      sessionId: input.sessionId,
      participantId: participant.id,
      playerId: input.payload.playerId,
      slotCode: 'slotCode' in input.payload ? input.payload.slotCode : undefined,
      definition,
      selectedPlayerIds,
      existingSelections,
    });

    const selectionOrder = participant.selectionCount + 1;
    const newAggregate = participant.aggregateValue + metricValue;
    const newSelectionCount = selectionOrder;
    const newStateVersion = session.stateVersion + 1;
    const pendingSelectionCounts = new Map(
      session.participants.map((entry) => [entry.id, entry.selectionCount]),
    );
    pendingSelectionCounts.set(participant.id, newSelectionCount);
    const sessionComplete = isSessionFullyComplete(
      session.participants,
      definition.selectionCount,
      pendingSelectionCounts,
    );
    const now = new Date();

    const versionUpdate = await this.prisma.gameSession.updateMany({
      where: {
        id: input.sessionId,
        stateVersion: input.expectedVersion,
        status: 'IN_PROGRESS',
      },
      data: {
        stateVersion: newStateVersion,
        ...(sessionComplete ? { status: 'COMPLETED', completedAt: now } : {}),
      },
    });

    if (versionUpdate.count === 0) {
      throw new DomainException(
        ErrorCode.STATE_VERSION_CONFLICT,
        'State version conflict. Refresh and retry.',
      );
    }

    const lastEvent = await this.prisma.gameEvent.findFirst({
      where: { gameSessionId: input.sessionId },
      orderBy: { sequence: 'desc' },
    });
    const nextSequence = (lastEvent?.sequence ?? 0) + 1;

    try {
      await this.prisma.gameAction.create({
        data: {
          actionId: input.actionId,
          gameSessionId: input.sessionId,
          participantId: participant.id,
          actionType: GameActionType.SELECT_PLAYER,
          expectedVersion: input.expectedVersion,
          payload: input.payload as object,
          processedAt: now,
          resultVersion: newStateVersion,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const state = await this.buildState(input.sessionId, input.participantId);
        return {
          state,
          eventType: GameEventType.PLAYER_SELECTED,
          completed: state.status === 'COMPLETED',
          idempotentReplay: true,
        };
      }
      throw error;
    }

    await this.prisma.gameSelection.create({
      data: {
        gameSessionId: input.sessionId,
        participantId: participant.id,
        playerId: input.payload.playerId,
        selectionOrder,
        metricCode: definition.metric,
        metricValueSnapshot: metricValue,
        playerSnapshot: {
          ...playerSnapshot,
          slotCode: 'slotCode' in input.payload ? input.payload.slotCode : null,
        } as object,
      },
    });

    await this.prisma.gameParticipant.update({
      where: { id: participant.id },
      data: {
        aggregateValue: newAggregate,
        selectionCount: newSelectionCount,
        status: sessionComplete ? 'COMPLETED' : 'ACTIVE',
      },
    });

    await this.prisma.gameEvent.create({
      data: {
        gameSessionId: input.sessionId,
        sequence: nextSequence,
        eventType: GameEventType.PLAYER_SELECTED,
        participantId: participant.id,
        payload: {
          playerId: input.payload.playerId,
          selectionOrder,
          slotCode: 'slotCode' in input.payload ? input.payload.slotCode : null,
          metricValue,
          aggregateValue: newAggregate,
        },
      },
    });

    if (sessionComplete && session.targetValue != null) {
      for (const sessionParticipant of session.participants) {
        const participantSelections = session.selections
          .filter((selection) => selection.participantId === sessionParticipant.id)
          .map((selection) => ({
            playerId: selection.playerId,
            selectionOrder: selection.selectionOrder,
            slotCode:
              ((selection.playerSnapshot as Record<string, unknown>).slotCode as string | undefined) ??
              null,
            metricValue: selection.metricValueSnapshot,
            playerSnapshot: selection.playerSnapshot as Record<string, unknown>,
          }));

        const participantAggregate =
          sessionParticipant.id === participant.id
            ? newAggregate
            : sessionParticipant.aggregateValue;

        if (sessionParticipant.id === participant.id) {
          participantSelections.push({
            playerId: input.payload.playerId,
            selectionOrder,
            slotCode: 'slotCode' in input.payload ? input.payload.slotCode : null,
            metricValue,
            playerSnapshot: {
              ...playerSnapshot,
              slotCode: 'slotCode' in input.payload ? input.payload.slotCode : null,
            },
          });
        }

        const completion = await hooks.onComplete({
          targetValue: session.targetValue,
          aggregateValue: participantAggregate,
          definition,
          selections: participantSelections,
          startedAt: session.startedAt,
          completedAt: now,
        });

        await this.prisma.gameResult.create({
          data: {
            gameSessionId: input.sessionId,
            participantId: sessionParticipant.id,
            targetValue: completion.targetValue,
            aggregateValue: completion.aggregateValue,
            absoluteDifference: completion.absoluteDifference,
            exactHit: completion.exactHit,
            performanceRating: completion.performanceRating as
              'PERFECT' | 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR',
            resultPayload: completion.resultPayload as object,
          },
        });
      }

      await this.prisma.gameParticipant.updateMany({
        where: { gameSessionId: input.sessionId },
        data: { status: 'COMPLETED' },
      });

      await this.prisma.gameEvent.create({
        data: {
          gameSessionId: input.sessionId,
          sequence: nextSequence + 1,
          eventType: GameEventType.GAME_COMPLETED,
          participantId: participant.id,
          payload: {
            playerMode: runtime.playerMode,
            participantCount: session.participants.length,
          },
        },
      });
    }

    const state = await this.buildState(input.sessionId, input.participantId);
    return {
      state,
      eventType: sessionComplete ? GameEventType.GAME_COMPLETED : GameEventType.PLAYER_SELECTED,
      completed: sessionComplete,
      idempotentReplay: false,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
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

    return this.toResultView(session, participant, result);
  }

  async getResults(
    sessionId: string,
    externalParticipantId: string,
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
        return this.toResultView(session, participant, result);
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
    };

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
    };
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

  private async buildState(sessionId: string, participantId: string) {
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
      selections: session.selections
        .filter((s) => s.participantId === participantId)
        .map((s) => ({
          playerId: s.playerId,
          selectionOrder: s.selectionOrder,
          slotCode:
            ((s.playerSnapshot as Record<string, unknown>).slotCode as string | undefined) ?? null,
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
  }): GameSessionView {
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
      })),
      selections: session.selections.map((s) => ({
        id: s.id,
        participantId: s.participantId,
        playerId: s.playerId,
        selectionOrder: s.selectionOrder,
        slotCode:
          ((s.playerSnapshot as Record<string, unknown>).slotCode as string | undefined) ?? null,
        metricCode: s.metricCode,
        metricValueSnapshot: revealImmediate ? s.metricValueSnapshot : 0,
        playerSnapshot: s.playerSnapshot as Record<string, unknown>,
        revealed: revealImmediate,
      })),
    };
  }
}
