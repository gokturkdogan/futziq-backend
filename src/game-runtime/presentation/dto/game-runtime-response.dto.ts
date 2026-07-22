import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlayerSnapshotDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional({ example: 'Cristiano Ronaldo' })
  displayName?: string;

  @ApiPropertyOptional({ nullable: true })
  firstName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Defender' })
  primaryPosition?: string | null;

  @ApiPropertyOptional({ nullable: true })
  subPosition?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 188 })
  heightCm?: number | null;

  @ApiPropertyOptional({ nullable: true })
  isActive?: boolean | null;

  @ApiPropertyOptional({ type: [String], example: ['CB', 'LB'] })
  normalizedPositions?: string[];
}

export class DraftLineupSlotDto {
  @ApiProperty({ example: 'GK' })
  slotCode!: string;

  @ApiProperty({ example: 'Kaleci' })
  displayName!: string;

  @ApiProperty({ enum: ['GK', 'DEF', 'MID', 'ATT'], example: 'GK' })
  line!: string;

  @ApiProperty()
  occupied!: boolean;

  @ApiPropertyOptional({ nullable: true })
  playerId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 198 })
  metricValue!: number | null;

  @ApiPropertyOptional({ type: PlayerSnapshotDto, nullable: true })
  playerSnapshot!: PlayerSnapshotDto | null;
}

export class GameSelectionResponseDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  participantId?: string;

  @ApiProperty()
  playerId!: string;

  @ApiProperty({ example: 1 })
  selectionOrder!: number;

  @ApiPropertyOptional({ nullable: true, example: 'DEF1' })
  slotCode!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 128 })
  metricValue!: number | null;

  @ApiPropertyOptional({ example: 'CAREER_GOALS' })
  metricCode?: string;

  @ApiProperty({ type: PlayerSnapshotDto })
  playerSnapshot!: PlayerSnapshotDto;

  @ApiProperty({ description: 'False when revealPolicy is GAME_END and session is in progress' })
  revealed!: boolean;
}

export class GameParticipantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Matches X-Participant-Id header value' })
  externalParticipantId!: string;

  @ApiProperty({ example: 0 })
  turnOrder!: number;

  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'] })
  status!: string;

  @ApiProperty({ example: 512 })
  aggregateValue!: number;

  @ApiProperty({ example: 5 })
  selectionCount!: number;

  @ApiPropertyOptional({
    type: [DraftLineupSlotDto],
    nullable: true,
    description: 'Populated for DRAFT family; null for TARGET_HUNT',
  })
  lineup!: DraftLineupSlotDto[] | null;
}

export class GameDefinitionSnapshotDto {
  @ApiProperty({ enum: ['TARGET_HUNT', 'DRAFT'] })
  family!: string;

  @ApiProperty({ example: 'CAREER_GOALS' })
  metric!: string;

  @ApiProperty({ example: 'GLOBAL_FREE' })
  scope!: string;

  @ApiProperty({ example: 5 })
  selectionCount!: number;

  @ApiProperty({ enum: ['IMMEDIATE', 'GAME_END'], example: 'IMMEDIATE' })
  revealPolicy!: string;

  @ApiPropertyOptional({ enum: ['MAX', 'MIN'] })
  objective?: string;
}

export class GameSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETED', 'CREATED'] })
  status!: string;

  @ApiProperty({ description: 'Optimistic concurrency token; send as expectedVersion on actions' })
  stateVersion!: number;

  @ApiPropertyOptional({ nullable: true, description: 'Target Hunt only; Draft returns 0 or null' })
  targetValue!: number | null;

  @ApiProperty()
  seed!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'CAREER',
    description: 'Resolved scope. RANDOM becomes CAREER, CLUB, etc.',
  })
  scopeCode!: string | null;

  @ApiProperty({ enum: ['TARGET_HUNT', 'DRAFT'] })
  family!: string;

  @ApiProperty({ enum: ['SINGLE', 'MULTIPLAYER'] })
  playerMode!: string;

  @ApiPropertyOptional({ nullable: true })
  currentTurnParticipantId!: string | null;

  @ApiProperty({ type: GameDefinitionSnapshotDto })
  definitionSnapshot!: GameDefinitionSnapshotDto;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ type: [GameParticipantResponseDto] })
  participants!: GameParticipantResponseDto[];

  @ApiProperty({ type: [GameSelectionResponseDto] })
  selections!: GameSelectionResponseDto[];
}

export class ActionStateResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  stateVersion!: number;

  @ApiPropertyOptional({ nullable: true })
  targetValue!: number | null;

  @ApiProperty()
  selectionCount!: number;

  @ApiProperty()
  aggregateValue!: number;

  @ApiProperty({ enum: ['SINGLE', 'MULTIPLAYER'] })
  playerMode!: string;

  @ApiPropertyOptional({ nullable: true })
  currentTurnParticipantId!: string | null;

  @ApiPropertyOptional({ type: [DraftLineupSlotDto], nullable: true })
  lineup!: DraftLineupSlotDto[] | null;

  @ApiProperty({ type: [GameSelectionResponseDto] })
  selections!: GameSelectionResponseDto[];
}

export class ActionResponseDto {
  @ApiProperty({ type: ActionStateResponseDto })
  state!: ActionStateResponseDto;

  @ApiProperty({ enum: ['PLAYER_SELECTED', 'GAME_COMPLETED'] })
  eventType!: string;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ description: 'True when the same actionId was already processed' })
  idempotentReplay!: boolean;
}

export class ResultSelectionDto {
  @ApiProperty()
  playerId!: string;

  @ApiProperty()
  selectionOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  slotCode!: string | null;

  @ApiProperty()
  metricValue!: number;

  @ApiProperty({ type: PlayerSnapshotDto })
  playerSnapshot!: PlayerSnapshotDto;
}

export class TargetHuntResultResponseDto {
  @ApiProperty({ enum: ['TARGET_HUNT'] })
  kind!: 'TARGET_HUNT';

  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  participantId!: string;

  @ApiProperty()
  targetValue!: number;

  @ApiProperty()
  aggregateValue!: number;

  @ApiProperty()
  absoluteDifference!: number;

  @ApiProperty()
  exactHit!: boolean;

  @ApiProperty({ enum: ['PERFECT', 'EXCELLENT', 'GOOD', 'AVERAGE', 'POOR'] })
  performanceRating!: string;

  @ApiProperty()
  selectionCount!: number;

  @ApiProperty({ type: [ResultSelectionDto] })
  selections!: ResultSelectionDto[];

  @ApiProperty()
  durationMs!: number;

  @ApiProperty()
  sessionStatus!: string;

  @ApiProperty({ enum: ['FINAL', 'PENDING'] })
  resultStatus!: string;
}

export class DraftResultResponseDto {
  @ApiProperty({ enum: ['DRAFT'] })
  kind!: 'DRAFT';

  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  participantId!: string;

  @ApiProperty({ enum: ['MAX', 'MIN'] })
  objective!: string;

  @ApiProperty()
  aggregateValue!: number;

  @ApiProperty()
  totalMetricValue!: number;

  @ApiProperty()
  averageMetricValue!: number;

  @ApiProperty()
  selectionCount!: number;

  @ApiProperty({ type: [ResultSelectionDto] })
  selections!: ResultSelectionDto[];

  @ApiProperty({ type: [DraftLineupSlotDto] })
  lineup!: DraftLineupSlotDto[];

  @ApiProperty()
  durationMs!: number;

  @ApiProperty()
  sessionStatus!: string;

  @ApiProperty({ enum: ['FINAL', 'PENDING'] })
  resultStatus!: string;
}

export class EligiblePlayerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Cristiano Ronaldo' })
  displayName!: string;

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  primaryPosition!: string | null;

  @ApiPropertyOptional({ nullable: true })
  subPosition!: string | null;

  @ApiProperty({ type: [String] })
  normalizedPositions!: string[];

  @ApiPropertyOptional({ nullable: true })
  isActive!: boolean | null;

  @ApiProperty({ description: 'True when player is already picked in this session' })
  alreadySelected!: boolean;
}

export class PaginatedEligiblePlayersDto {
  @ApiProperty({ type: [EligiblePlayerResponseDto] })
  items!: EligiblePlayerResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class GameEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sequence!: number;

  @ApiProperty({ enum: ['SESSION_STARTED', 'PLAYER_SELECTED', 'GAME_COMPLETED'] })
  eventType!: string;

  @ApiPropertyOptional({ nullable: true })
  participantId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}
