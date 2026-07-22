import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GAME_SESSION_REPOSITORY, GameSessionRepository } from '../domain/game-session.repository';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { GameFamilyRegistry } from '../../game-engine/registries/game-family.registry';
import { ScopeRegistry } from '../../game-engine/registries/scope.registry';
import { parseGameDefinitionConfig } from '../../game-engine/core/config-parser';
import { PlayerMode } from '../domain/session-runtime';

@Injectable()
export class GameRuntimeService {
  constructor(
    @Inject(GAME_SESSION_REPOSITORY)
    private readonly sessionRepository: GameSessionRepository,
    private readonly gameFamilyRegistry: GameFamilyRegistry,
    private readonly scopeRegistry: ScopeRegistry,
    private readonly configService: ConfigService,
  ) {}

  createSession(
    input: {
      familyCode: string;
      gameCode: string;
      scopeCode?: string;
      targetValue?: number;
      playerMode?: PlayerMode;
    },
    externalParticipantId: string,
  ) {
    const expiryHours = this.configService.get<number>('SESSION_EXPIRY_HOURS', 24);
    return this.sessionRepository.createSession({
      ...input,
      playerMode: input.playerMode ?? PlayerMode.SINGLE,
      externalParticipantId,
      sessionExpiryHours: expiryHours,
    });
  }

  async getSession(sessionId: string, externalParticipantId: string) {
    const session = await this.sessionRepository.getSessionForParticipant(
      sessionId,
      externalParticipantId,
    );
    if (!session) {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_FOUND, 'Game session not found.');
    }
    return session;
  }

  async searchPlayers(
    sessionId: string,
    externalParticipantId: string,
    query: string,
    page: number,
    limit: number,
    slotCode?: string,
  ) {
    const session = await this.getSession(sessionId, externalParticipantId);
    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    let participant = session.participants.find(
      (p) => p.externalParticipantId === externalParticipantId,
    );
    if (!participant && session.playerMode === PlayerMode.MULTIPLAYER) {
      participant =
        session.participants.find((p) => p.id === session.currentTurnParticipantId) ??
        session.participants[0];
    }
    if (!participant) {
      throw new DomainException(ErrorCode.INVALID_GAME_ACTION, 'Participant not found.');
    }

    const excludePlayerIds =
      session.playerMode === PlayerMode.MULTIPLAYER
        ? session.selections.map((selection) => selection.playerId)
        : session.selections
            .filter((selection) => selection.participantId === participant.id)
            .map((selection) => selection.playerId);

    const scopeResolver = this.scopeRegistry.get(definition.scope);
    return scopeResolver.searchEligiblePlayers(
      { code: definition.scope, params: definition.scopeParams },
      { query, page, limit, excludePlayerIds, slotCode },
      { sessionId, definition, scopeParams: slotCode ? { slotCode } : undefined },
    );
  }

  async processAction(
    sessionId: string,
    externalParticipantId: string,
    input: {
      actionId: string;
      expectedVersion: number;
      playerId: string;
      slotCode?: string;
    },
  ) {
    const session = await this.getSession(sessionId, externalParticipantId);
    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    const participant = session.participants.find(
      (p) => p.externalParticipantId === externalParticipantId,
    );
    if (!participant) {
      throw new DomainException(ErrorCode.INVALID_GAME_ACTION, 'Participant not found.');
    }

    const handler = this.gameFamilyRegistry.get(definition.family);
    return handler.processAction({
      sessionId,
      participantId: participant.id,
      actionId: input.actionId,
      actionType: 'SELECT_PLAYER',
      expectedVersion: input.expectedVersion,
      payload: input.slotCode
        ? { playerId: input.playerId, slotCode: input.slotCode }
        : { playerId: input.playerId },
    });
  }

  getEvents(sessionId: string, externalParticipantId: string) {
    return this.getSession(sessionId, externalParticipantId).then(() =>
      this.sessionRepository.getEvents(sessionId),
    );
  }

  async getResult(sessionId: string, externalParticipantId: string) {
    await this.getSession(sessionId, externalParticipantId);
    const result = await this.sessionRepository.getResult(sessionId, externalParticipantId);
    if (!result) {
      throw new DomainException(ErrorCode.RESULT_NOT_AVAILABLE, 'Result is not available yet.');
    }
    return result;
  }

  async getResults(sessionId: string, externalParticipantId: string) {
    await this.getSession(sessionId, externalParticipantId);
    const results = await this.sessionRepository.getResults(sessionId, externalParticipantId);
    if (results.length === 0) {
      throw new DomainException(ErrorCode.RESULT_NOT_AVAILABLE, 'Result is not available yet.');
    }
    return results;
  }
}
