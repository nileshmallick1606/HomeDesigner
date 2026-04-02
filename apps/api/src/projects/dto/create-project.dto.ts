import { IsString, IsOptional, IsNumber, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Dream Home' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, example: 500000 })
  @IsOptional()
  @IsNumber()
  overallBudget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timelineStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timelineEnd?: string;
}
