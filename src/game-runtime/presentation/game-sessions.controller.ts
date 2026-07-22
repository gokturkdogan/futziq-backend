import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { GameRuntimeService } from '../application/game-runtime.service';
import {
  CreateGameSessionDto,
  PlayerSearchQueryDto,
  SelectPlayerActionDto,
} from './dto/game-runtime.dto';
import {
  ActionResponseDto,
  DraftResultResponseDto,
  GameEventResponseDto,
  GameSessionResponseDto,
  PaginatedEligiblePlayersDto,
  TargetHuntResultResponseDto,
} from './dto/game-runtime-response.dto';
import { IDENTITY_PROVIDER, IdentityProvider } from '../../common/security/identity.provider';
import { Locale } from '../../common/locale/locale.decorator';
import { ErrorResponseDto } from '../../common/swagger/error-response.dto';

@ApiTags('game-sessions')
@Controller('api/v1/game-sessions')
@ApiSecurity('X-Participant-Id')
@ApiHeader({
  name: 'X-Participant-Id',
  description:
    'Stable participant identity for the current user/device. Required for session ownership.',
  required: true,
  example: 'dev-user-123',
})
@ApiHeader({
  name: 'Accept-Language',
  description: 'Preferred locale (`tr` or `en`). Localizes lineup slot displayName in responses.',
  required: false,
  example: 'tr',
})
export class GameSessionsController {
  constructor(
    private readonly runtimeService: GameRuntimeService,
    @Inject(IDENTITY_PROVIDER) private readonly identityProvider: IdentityProvider,
  ) {}

  private resolveParticipant(req: Request) {
    return this.identityProvider.resolve(req).participantId;
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new game session',
    description:
      'Starts a game. For Target Hunt with `scopeCode: RANDOM`, backend picks a playable scope at create time. ' +
      'Response `scopeCode` is always the resolved code (e.g. `CAREER`). Use `capabilities` from catalog to drive UI.',
  })
  @ApiOkResponse({ type: GameSessionResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'GAME_SCOPE_REQUIRED, VALIDATION_ERROR' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'GAME_NOT_FOUND' })
  create(@Body() dto: CreateGameSessionDto, @Req() req: Request, @Locale() locale: string) {
    const participantId = this.resolveParticipant(req);
    return this.runtimeService.createSession(
      {
        familyCode: dto.familyCode,
        gameCode: dto.gameCode,
        scopeCode: dto.scopeCode,
        targetValue: dto.targetValue,
        playerMode: dto.playerMode,
      },
      participantId,
      locale,
    );
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get current game session state' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID returned from POST /game-sessions' })
  @ApiOkResponse({ type: GameSessionResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'GAME_SESSION_NOT_FOUND' })
  getSession(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Locale() locale: string,
  ) {
    return this.runtimeService.getSession(sessionId, this.resolveParticipant(req), locale);
  }

  @Get(':sessionId/players')
  @ApiOperation({
    summary: 'Search eligible players',
    description:
      'Min query length 2. For Draft (`capabilities.slotBased`), pass `slotCode` to filter by formation position. ' +
      'Metric values are not returned in search — revealed after selection per `revealPolicy`.',
  })
  @ApiParam({ name: 'sessionId' })
  @ApiOkResponse({ type: PaginatedEligiblePlayersDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  searchPlayers(
    @Param('sessionId') sessionId: string,
    @Query() query: PlayerSearchQueryDto,
    @Req() req: Request,
    @Locale() locale: string,
  ) {
    return this.runtimeService.searchPlayers(
      sessionId,
      this.resolveParticipant(req),
      query.q,
      query.page ?? 1,
      query.limit ?? 20,
      query.slotCode,
      locale,
    );
  }

  @Post(':sessionId/actions')
  @ApiOperation({
    summary: 'Submit SELECT_PLAYER action',
    description:
      'Idempotent via `actionId` (client-generated UUID). Send current `stateVersion` as `expectedVersion`. ' +
      'Draft requires `slotCode` (e.g. GK, DEF1, ATT). On success, use returned `state.stateVersion` for the next action.',
  })
  @ApiParam({ name: 'sessionId' })
  @ApiOkResponse({ type: ActionResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'STATE_VERSION_CONFLICT, PLAYER_ALREADY_SELECTED, GAME_SESSION_NOT_ACTIVE',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'NOT_YOUR_TURN, PLAYER_NOT_ELIGIBLE, SELECTION_LIMIT_REACHED, INVALID_GAME_ACTION',
  })
  processAction(
    @Param('sessionId') sessionId: string,
    @Body() dto: SelectPlayerActionDto,
    @Req() req: Request,
    @Locale() locale: string,
  ) {
    return this.runtimeService.processAction(sessionId, this.resolveParticipant(req), dto, locale);
  }

  @Get(':sessionId/events')
  @ApiOperation({ summary: 'List ordered game events (audit / replay)' })
  @ApiParam({ name: 'sessionId' })
  @ApiOkResponse({ type: GameEventResponseDto, isArray: true })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getEvents(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Locale() locale: string,
  ) {
    return this.runtimeService.getEvents(sessionId, this.resolveParticipant(req), locale);
  }

  @Get(':sessionId/result')
  @ApiOperation({
    summary: 'Get result for the current participant',
    description:
      'Discriminated by `kind`. Target Hunt: `TargetHuntResultResponseDto`. Draft: `DraftResultResponseDto`.',
  })
  @ApiParam({ name: 'sessionId' })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/TargetHuntResultResponseDto' },
        { $ref: '#/components/schemas/DraftResultResponseDto' },
      ],
    },
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'RESULT_NOT_AVAILABLE' })
  getResult(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Locale() locale: string,
  ) {
    return this.runtimeService.getResult(sessionId, this.resolveParticipant(req), locale);
  }

  @Get(':sessionId/results')
  @ApiOperation({
    summary: 'Get all participant results (multiplayer)',
    description: 'Returns one result per participant, sorted by turnOrder.',
  })
  @ApiParam({ name: 'sessionId' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { $ref: '#/components/schemas/TargetHuntResultResponseDto' },
          { $ref: '#/components/schemas/DraftResultResponseDto' },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getResults(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Locale() locale: string,
  ) {
    return this.runtimeService.getResults(sessionId, this.resolveParticipant(req), locale);
  }
}
