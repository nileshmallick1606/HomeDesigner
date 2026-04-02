import { IsString, IsOptional, IsEnum, IsNumber, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum RoomType {
  BATHROOM = 'BATHROOM',
  KITCHEN = 'KITCHEN',
  BEDROOM = 'BEDROOM',
  LIVING_ROOM = 'LIVING_ROOM',
  DINING_ROOM = 'DINING_ROOM',
  BALCONY = 'BALCONY',
  UTILITY = 'UTILITY',
  CUSTOM = 'CUSTOM',
}

export class CreateRoomDto {
  @ApiProperty({ example: 'Master Bathroom' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: RoomType, default: RoomType.CUSTOM })
  @IsEnum(RoomType)
  type: RoomType = RoomType.CUSTOM;

  @ApiProperty({ required: false, example: 50000 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
