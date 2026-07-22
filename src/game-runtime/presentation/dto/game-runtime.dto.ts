import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PlayerMode } from '../../domain/session-runtime';

export class CreateGameSessionDto {
  @ApiProperty({ example: 'TARGET_HUNT' })
  @IsString()
  familyCode!: string;

  @ApiProperty({ example: 'GOALS' })
  @IsString()
  gameCode!: string;

  @ApiPropertyOptional({ example: 'CAREER' })
  @IsOptional()
  @IsString()
  scopeCode?: string;

  @ApiPropertyOptional({
    enum: PlayerMode,
    example: PlayerMode.SINGLE,
    description: 'SINGLE for solo play, MULTIPLAYER for same-screen pass-and-play with 2 players.',
  })
  @IsOptional()
  @IsEnum(PlayerMode)
  playerMode?: PlayerMode;

  @ApiPropertyOptional({
    example: 500,
    description: 'Optional fixed target. If omitted, backend generates a random target.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetValue?: number;
}

export class SelectPlayerActionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  actionId!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @ApiProperty({ example: 'player-cuid-id' })
  @IsString()
  @MinLength(1)
  playerId!: string;

  @ApiPropertyOptional({ example: 'LB' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slotCode?: string;
}

export class PlayerSearchQueryDto {
  @ApiProperty({ example: 'ronaldo', minLength: 2 })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'LB' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slotCode?: string;
}
