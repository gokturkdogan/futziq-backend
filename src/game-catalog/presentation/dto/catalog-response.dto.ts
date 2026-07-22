import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GameCapabilitiesDto {
  @ApiProperty({ enum: ['TARGET_HUNT', 'DRAFT'], example: 'TARGET_HUNT' })
  family!: string;

  @ApiProperty({ description: 'When true, scopeCode is required on session create' })
  requiresScope!: boolean;

  @ApiProperty({ example: 5, description: 'Number of player picks per participant' })
  selectionCount!: number;

  @ApiProperty({ description: 'True for DRAFT — UI must send slotCode on each action' })
  slotBased!: boolean;

  @ApiProperty({ description: 'True for TARGET_HUNT — show targetValue' })
  hasTarget!: boolean;

  @ApiProperty({ example: ['SELECT_PLAYER'] })
  supportedActions!: string[];

  @ApiProperty({ enum: ['SINGLE', 'MULTIPLAYER', 'BOTH'], example: 'BOTH' })
  playerMode!: string;
}

export class GameScopeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'CAREER' })
  code!: string;

  @ApiProperty({ example: 'Kariyer' })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'null for RANDOM scope — client shows shuffle icon',
  })
  imageUrl!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class GameSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'GOALS' })
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bannerImageUrl!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  requiresScope!: boolean;

  @ApiPropertyOptional({ type: [GameScopeSummaryDto], nullable: true })
  scopes!: GameScopeSummaryDto[] | null;

  @ApiProperty({
    type: GameCapabilitiesDto,
    description: 'Use this manifest to build setup UI without hardcoding family logic',
  })
  capabilities!: GameCapabilitiesDto;
}

export class GameFamilySummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['TARGET_HUNT', 'DRAFT'] })
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class GameFamilyDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['TARGET_HUNT', 'DRAFT'] })
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({
    description: 'SHA-1 hash for client cache invalidation. Store with locale key.',
    example: 'a1b2c3d4e5f6',
  })
  catalogVersion!: string;

  @ApiProperty({ type: [GameSummaryResponseDto] })
  games!: GameSummaryResponseDto[];
}
