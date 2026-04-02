import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDesignDto {
  @ApiProperty({ required: false, description: 'Fabric.js canvas state JSON' })
  @IsOptional()
  @IsObject()
  canvasState?: Record<string, unknown>;
}
