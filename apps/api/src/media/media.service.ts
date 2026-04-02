import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import { ImageProcessingService } from './image-processing.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async processUpload(
    userId: string,
    roomId: string,
    fileBuffer: Buffer,
    mimeType?: string,
  ) {
    // Step 1: Validate image (DC-5: magic bytes)
    const detectedMimeType = this.imageProcessing.validateImage(fileBuffer, mimeType);

    // Step 2: Strip EXIF (DC-5)
    const stripped = await this.imageProcessing.stripExif(fileBuffer);

    // Step 3: Store original in R2 immediately (DC-2)
    const photoId = uuidv4();
    const originalKey = `${userId}/photos/${photoId}/original.webp`;

    // Step 4: Compress to WebP
    const compressed = await this.imageProcessing.compress(stripped);
    await this.r2.upload(originalKey, compressed.buffer, 'image/webp');

    // Step 5: Generate thumbnails
    const thumbnails = await this.imageProcessing.generateThumbnails(compressed.buffer);
    const thumbnailUrls: Record<number, string> = {};

    for (const thumb of thumbnails) {
      const thumbKey = `${userId}/photos/${photoId}/thumb-${thumb.width}.webp`;
      await this.r2.upload(thumbKey, thumb.buffer, 'image/webp');
      thumbnailUrls[thumb.width] = this.r2.getPublicUrl(thumbKey);
    }

    // Step 6: Create DB record
    const photo = await this.prisma.roomPhoto.create({
      data: {
        id: photoId,
        roomId,
        originalUrl: this.r2.getPublicUrl(originalKey),
        thumbnailUrl: thumbnailUrls[600] || null,
        width: compressed.width,
        height: compressed.height,
        sizeBytes: compressed.buffer.length,
        mimeType: 'image/webp',
      },
    });

    this.logger.log(`Photo processed: ${photoId} for room ${roomId}`);
    return photo;
  }

  async getPhoto(photoId: string) {
    const photo = await this.prisma.roomPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return photo;
  }

  async deletePhoto(photoId: string, userId: string) {
    const photo = await this.prisma.roomPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Delete from R2
    const baseKey = `${userId}/photos/${photoId}`;
    await Promise.allSettled([
      this.r2.delete(`${baseKey}/original.webp`),
      this.r2.delete(`${baseKey}/thumb-300.webp`),
      this.r2.delete(`${baseKey}/thumb-600.webp`),
      this.r2.delete(`${baseKey}/thumb-1200.webp`),
    ]);

    // Delete DB record
    await this.prisma.roomPhoto.delete({ where: { id: photoId } });

    this.logger.log(`Photo deleted: ${photoId}`);
    return { success: true };
  }
}
