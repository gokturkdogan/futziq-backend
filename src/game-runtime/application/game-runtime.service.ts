import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GAME_SESSION_REPOSITORY, GameSessionRepository } from '../domain/game-session.repository';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { ScopeRegistry } from '../../game-engine/registries/scope.registry';
import { parseGameDefinitionConfig } from '../../game-engine/core/config-parser';
import { parseSessionRuntime, PlayerMode } from '../domain/session-runtime';
import { mergeScopeParams } from '../domain/draft-round';
import { SessionOrchestrator } from './session-orchestrator.service';
import { ClientViewMapper } from '../../client-contract/client-view.mapper';

@Injectable()
export class GameRuntimeService {
  constructor(
    @Inject(GAME_SESSION_REPOSITORY)
    private readonly sessionRepository: GameSessionRepository,
    private readonly scopeRegistry: ScopeRegistry,
    private readonly sessionOrchestrator: SessionOrchestrator,
    private readonly configService: ConfigService,
  ) {}

  async createSession(
    input: {
      familyCode: string;
      gameCode: string;
      scopeCode?: string;
      targetValue?: number;
      playerMode?: PlayerMode;
    },
    externalParticipantId: string,
    locale = 'en',
  ) {
    const expiryHours = this.configService.get<number>('SESSION_EXPIRY_HOURS', 24);
    const session = await this.sessionRepository.createSession({
      ...input,
      playerMode: input.playerMode ?? PlayerMode.SINGLE,
      externalParticipantId,
      sessionExpiryHours: expiryHours,
    });
    const view = await this.sessionRepository.getSessionView(session.id, locale);
    return ClientViewMapper.toGameSessionResponse(view ?? session);
  }

  async getSession(sessionId: string, externalParticipantId: string, locale = 'en') {
    const session = await this.sessionRepository.getSessionForParticipant(
      sessionId,
      externalParticipantId,
      locale,
    );
    if (!session) {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_FOUND, 'Game session not found.');
    }
    return ClientViewMapper.toGameSessionResponse(session);
  }

  async searchPlayers(
    sessionId: string,
    externalParticipantId: string,
    query: string,
    page: number,
    limit: number,
    slotCode?: string,
    locale = 'en',
  ) {
    const session = await this.sessionRepository.getSessionForParticipant(
      sessionId,
      externalParticipantId,
      locale,
    );
    if (!session) {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_FOUND, 'Game session not found.');
    }

    const definition = parseGameDefinitionConfig(session.definitionSnapshot);
    const runtime = parseSessionRuntime(session.definitionSnapshot);
    const scopeParams = mergeScopeParams(definition.scopeParams, runtime.draftRound);
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
    const result = await scopeResolver.searchEligiblePlayers(
      { code: definition.scope, params: scopeParams },
      { query, page, limit, excludePlayerIds, slotCode },
      {
        sessionId,
        definition,
        scopeParams: slotCode ? { ...scopeParams, slotCode } : scopeParams,
      },
    );

    return {
      ...result,
      items: result.items.map((player) => ClientViewMapper.toEligiblePlayerResponse(player)),
    };
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
    locale = 'en',
  ) {
    const session = await this.sessionRepository.getSessionForParticipant(
      sessionId,
      externalParticipantId,
      locale,
    );
    if (!session) {
      throw new DomainException(ErrorCode.GAME_SESSION_NOT_FOUND, 'Game session not found.');
    }

    const participant = session.participants.find(
      (p) => p.externalParticipantId === externalParticipantId,
    );
    if (!participant) {
      throw new DomainException(ErrorCode.INVALID_GAME_ACTION, 'Participant not found.');
    }

    const result = await this.sessionOrchestrator.processSelectPlayerAction({
      sessionId,
      participantId: participant.id,
      actionId: input.actionId,
      actionType: 'SELECT_PLAYER',
      expectedVersion: input.expectedVersion,
      payload: input.slotCode
        ? { playerId: input.playerId, slotCode: input.slotCode }
        : { playerId: input.playerId },
    });

    return ClientViewMapper.toActionResponse(result);
  }

  getEvents(sessionId: string, externalParticipantId: string, locale = 'en') {
    return this.getSession(sessionId, externalParticipantId, locale).then(() =>
      this.sessionRepository.getEvents(sessionId),
    );
  }

  async getResult(sessionId: string, externalParticipantId: string, locale = 'en') {
    await this.getSession(sessionId, externalParticipantId, locale);
    const result = await this.sessionRepository.getResult(sessionId, externalParticipantId, locale);
    if (!result) {
      throw new DomainException(ErrorCode.RESULT_NOT_AVAILABLE, 'Result is not available yet.');
    }
    const session = await this.sessionRepository.getSession(sessionId, locale);
    const definition = parseGameDefinitionConfig(session!.definitionSnapshot);
    return ClientViewMapper.toGameResultResponse(result, definition.family);
  }

  async getResults(sessionId: string, externalParticipantId: string, locale = 'en') {
    await this.getSession(sessionId, externalParticipantId, locale);
    const results = await this.sessionRepository.getResults(sessionId, externalParticipantId, locale);
    if (results.length === 0) {
      throw new DomainException(ErrorCode.RESULT_NOT_AVAILABLE, 'Result is not available yet.');
    }
    const session = await this.sessionRepository.getSession(sessionId, locale);
    const definition = parseGameDefinitionConfig(session!.definitionSnapshot);
    return results.map((result) => ClientViewMapper.toGameResultResponse(result, definition.family));
  }
}
