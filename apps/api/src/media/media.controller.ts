import {
  Controller, Post, Get, Delete, Param, Req, UseInterceptors,
  UploadedFile, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { MediaService } from './media.service';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/:roomId')
  @ApiOperation({ summary: 'Upload photo to a room' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @Req() req: Request,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user as { sub: string };
    return this.mediaService.processUpload(user.sub, roomId, file.buffer, file.mimetype);
  }

  @Get(':photoId')
  @ApiOperation({ summary: 'Get photo metadata' })
  async getPhoto(@Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.mediaService.getPhoto(photoId);
  }

  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete photo' })
  async deletePhoto(
    @Req() req: Request,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    const user = req.user as { sub: string };
    return this.mediaService.deletePhoto(photoId, user.sub);
  }
}
