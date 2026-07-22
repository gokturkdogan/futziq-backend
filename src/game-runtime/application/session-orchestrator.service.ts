import { Inject, Injectable } from '@nestjs/common';
import {
  GameActionType,
  GameEventType,
  RevealPolicy,
} from '../../game-engine/contracts/game-types';
import { parseGameDefinitionConfig } from '../../game-engine/core/config-parser';
import {
  ProcessActionInput,
  ProcessActionResult,
} from '../../game-engine/contracts/game-family-handler';
import { GameFamilyPlugin } from '../../game-engine/contracts/game-family.plugin';
import { GameFamilyPluginRegistry } from '../../game-engine/registries/game-family-plugin.registry';
import {
  GAME_SESSION_REPOSITORY,
  GameSessionRepository,
} from '../domain/game-session.repository';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { PrismaService } from '../../football-data/infrastructure/prisma.service';
import {
  getExpectedTurnParticipant,
  isSessionFullyComplete,
  parseSessionRuntime,
  PlayerMode,
} from '../domain/session-runtime';

@Injectable()
export class SessionOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginRegistry: GameFamilyPluginRegistry,
    @Inject(GAME_SESSION_REPOSITORY)
    private readonly sessionRepository: GameSessionRepository,
  ) {}

  async processSelectPlayerAction(input: ProcessActionInput): Promise<ProcessActionResult> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: input.sessionId },
      select: { definitionSnapshot: true },
    });
    if (!session) {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_FOUND, 'Game session not found.');
    }

    const plugin = this.pluginRegistry.get(
      parseGameDefinitionConfig(session.definitionSnapshot).family,
    );

    return this.processWithPlugin(input, plugin);
  }

  async processWithPlugin(
    input: ProcessActionInput,
    plugin: GameFamilyPlugin,
  ): Promise<ProcessActionResult> {
    if (input.actionType !== GameActionType.SELECT_PLAYER) {
      throw new DomainException(
        ErrorCode.INVALID_GAME_ACTION,
        `Unsupported action type: ${input.actionType}`,
      );
    }

    const existing = await this.prisma.gameAction.findFirst({
      where: {
        gameSessionId: input.sessionId,
        actionId: input.actionId,
      },
    });

    if (existing?.processedAt) {
      const state = await this.sessionRepository.buildActionState(
        input.sessionId,
        input.participantId,
      );
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
        throw new DomainException(ErrorCode.NOT_YOUR_TURN, 'It is not this participant turn.', {
          currentTurnParticipantId: expectedParticipant?.id ?? null,
        });
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
      (await this.sessionRepository.isPlayerSelectedInSession(
        input.sessionId,
        input.payload.playerId,
      ))
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
        slotCode: s.slotCode ?? this.readSlotCode(s.playerSnapshot),
        metricValue: s.metricValueSnapshot,
        playerSnapshot: s.playerSnapshot as Record<string, unknown>,
      }));

    const { metricValue, playerSnapshot } = await plugin.validateSelection({
      sessionId: input.sessionId,
      participantId: participant.id,
      playerId: input.payload.playerId,
      slotCode: 'slotCode' in input.payload ? input.payload.slotCode : undefined,
      definition,
      selectedPlayerIds,
      existingSelections,
      isPlayerSelectedInSession: (playerId) =>
        this.sessionRepository.isPlayerSelectedInSession(input.sessionId, playerId),
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
    const slotCode = 'slotCode' in input.payload ? input.payload.slotCode : null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const versionUpdate = await tx.gameSession.updateMany({
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

        const lastEvent = await tx.gameEvent.findFirst({
          where: { gameSessionId: input.sessionId },
          orderBy: { sequence: 'desc' },
        });
        let nextSequence = (lastEvent?.sequence ?? 0) + 1;

        await tx.gameAction.create({
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

        await tx.gameSelection.create({
          data: {
            gameSessionId: input.sessionId,
            participantId: participant.id,
            playerId: input.payload.playerId,
            selectionOrder,
            slotCode,
            metricCode: definition.metric,
            metricValueSnapshot: metricValue,
            playerSnapshot: {
              ...playerSnapshot,
              slotCode,
            } as object,
          },
        });

        await tx.gameParticipant.update({
          where: { id: participant.id },
          data: {
            aggregateValue: newAggregate,
            selectionCount: newSelectionCount,
            status: sessionComplete ? 'COMPLETED' : 'ACTIVE',
          },
        });

        await tx.gameEvent.create({
          data: {
            gameSessionId: input.sessionId,
            sequence: nextSequence,
            eventType: GameEventType.PLAYER_SELECTED,
            participantId: participant.id,
            payload: {
              playerId: input.payload.playerId,
              selectionOrder,
              slotCode,
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
                slotCode: selection.slotCode ?? this.readSlotCode(selection.playerSnapshot),
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
                slotCode,
                metricValue,
                playerSnapshot: {
                  ...playerSnapshot,
                  slotCode,
                },
              });
            }

            const completion = await plugin.buildCompletion({
              targetValue: session.targetValue,
              aggregateValue: participantAggregate,
              definition,
              selections: participantSelections,
              startedAt: session.startedAt,
              completedAt: now,
            });

            await tx.gameResult.create({
              data: {
                gameSessionId: input.sessionId,
                participantId: sessionParticipant.id,
                targetValue: completion.targetValue,
                aggregateValue: completion.aggregateValue,
                absoluteDifference: completion.absoluteDifference,
                exactHit: completion.exactHit,
                performanceRating: completion.performanceRating as
                  | 'PERFECT'
                  | 'EXCELLENT'
                  | 'GOOD'
                  | 'AVERAGE'
                  | 'POOR',
                resultPayload: completion.resultPayload as object,
              },
            });
          }

          await tx.gameParticipant.updateMany({
            where: { gameSessionId: input.sessionId },
            data: { status: 'COMPLETED' },
          });

          nextSequence += 1;
          await tx.gameEvent.create({
            data: {
              gameSessionId: input.sessionId,
              sequence: nextSequence,
              eventType: GameEventType.GAME_COMPLETED,
              participantId: participant.id,
              payload: {
                playerMode: runtime.playerMode,
                participantCount: session.participants.length,
              },
            },
          });
        }
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const state = await this.sessionRepository.buildActionState(
          input.sessionId,
          input.participantId,
        );
        return {
          state,
          eventType: GameEventType.PLAYER_SELECTED,
          completed: state.status === 'COMPLETED',
          idempotentReplay: true,
        };
      }
      throw error;
    }

    const state = await this.sessionRepository.buildActionState(
      input.sessionId,
      input.participantId,
    );
    return {
      state,
      eventType: sessionComplete ? GameEventType.GAME_COMPLETED : GameEventType.PLAYER_SELECTED,
      completed: sessionComplete,
      idempotentReplay: false,
    };
  }

  private readSlotCode(playerSnapshot: unknown): string | null {
    const slotCode = (playerSnapshot as Record<string, unknown>).slotCode;
    return typeof slotCode === 'string' ? slotCode : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}
