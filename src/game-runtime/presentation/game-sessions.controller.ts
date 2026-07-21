import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GameRuntimeService } from '../application/game-runtime.service';
import {
  CreateGameSessionDto,
  PlayerSearchQueryDto,
  SelectPlayerActionDto,
} from './dto/game-runtime.dto';
import { IDENTITY_PROVIDER, IdentityProvider } from '../../common/security/identity.provider';

@ApiTags('game-sessions')
@Controller('api/v1/game-sessions')
@ApiHeader({
  name: 'X-Participant-Id',
  description: 'Development participant identity (replace with auth in production)',
  required: false,
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
  @ApiOperation({ summary: 'Create a new game session' })
  create(@Body() dto: CreateGameSessionDto, @Req() req: Request) {
    const participantId = this.resolveParticipant(req);
    return this.runtimeService.createSession(
      {
        familyCode: dto.familyCode,
        gameCode: dto.gameCode,
        scopeCode: dto.scopeCode,
        targetValue: dto.targetValue,
      },
      participantId,
    );
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get game session state' })
  getSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.runtimeService.getSession(sessionId, this.resolveParticipant(req));
  }

  @Get(':sessionId/players')
  @ApiOperation({ summary: 'Search eligible players for session' })
  searchPlayers(
    @Param('sessionId') sessionId: string,
    @Query() query: PlayerSearchQueryDto,
    @Req() req: Request,
  ) {
    return this.runtimeService.searchPlayers(
      sessionId,
      this.resolveParticipant(req),
      query.q,
      query.page ?? 1,
      query.limit ?? 20,
      query.slotCode,
    );
  }

  @Post(':sessionId/actions')
  @ApiOperation({ summary: 'Submit a game action (SELECT_PLAYER)' })
  @ApiResponse({ status: 409, description: 'STATE_VERSION_CONFLICT or ACTION_ALREADY_PROCESSED' })
  processAction(
    @Param('sessionId') sessionId: string,
    @Body() dto: SelectPlayerActionDto,
    @Req() req: Request,
  ) {
    return this.runtimeService.processAction(sessionId, this.resolveParticipant(req), dto);
  }

  @Get(':sessionId/events')
  @ApiOperation({ summary: 'List game events for session' })
  getEvents(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.runtimeService.getEvents(sessionId, this.resolveParticipant(req));
  }

  @Get(':sessionId/result')
  @ApiOperation({ summary: 'Get game result' })
  @ApiResponse({ status: 404, description: 'RESULT_NOT_AVAILABLE' })
  getResult(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.runtimeService.getResult(sessionId, this.resolveParticipant(req));
  }
}
