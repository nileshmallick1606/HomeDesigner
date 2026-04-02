import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ImageProcessingService } from './image-processing.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, ImageProcessingService],
  exports: [MediaService, ImageProcessingService],
})
export class MediaModule {}
