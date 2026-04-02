import {
  Controller, Post, Get, Delete, Param, Req, Res, UseInterceptors,
  UploadedFile, ParseUUIDPipe, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { MediaService } from './media.service';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/:roomId')
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get photo metadata' })
  async getPhoto(@Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.mediaService.getPhoto(photoId);
  }

  @Delete(':photoId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete photo' })
  async deletePhoto(
    @Req() req: Request,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    const user = req.user as { sub: string };
    return this.mediaService.deletePhoto(photoId, user.sub);
  }

  @Public()
  @Get('files/*')
  @ApiOperation({ summary: 'Serve local uploaded files (dev only)' })
  async serveFile(@Req() req: Request, @Res() res: Response) {
    const filePath = req.path.replace('/api/media/files/', '');
    const fullPath = path.join(process.cwd(), 'uploads', filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(fullPath).pipe(res);
  }
}
