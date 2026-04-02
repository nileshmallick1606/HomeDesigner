import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// Magic bytes for image validation (DC-5)
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
};

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  validateImage(buffer: Buffer, declaredMimeType?: string): string {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File too large. Max size: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }

    // Check magic bytes (DC-5)
    let detectedType: string | null = null;
    for (const [mimeType, bytes] of Object.entries(MAGIC_BYTES)) {
      if (bytes.every((byte, i) => buffer[i] === byte)) {
        if (mimeType === 'image/webp') {
          // WebP needs additional check: RIFF....WEBP
          if (buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') {
            detectedType = mimeType;
            break;
          }
        } else {
          detectedType = mimeType;
          break;
        }
      }
    }

    if (!detectedType) {
      throw new BadRequestException('Invalid image file. Supported formats: JPEG, PNG, WebP');
    }

    return detectedType;
  }

  async stripExif(buffer: Buffer): Promise<Buffer> {
    // Sharp strips EXIF by default when processing (DC-5)
    return sharp(buffer).rotate().toBuffer(); // rotate() applies EXIF orientation then strips
  }

  async compress(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const maxDimension = 4096;
    const needsResize =
      (metadata.width && metadata.width > maxDimension) ||
      (metadata.height && metadata.height > maxDimension);

    let result = image;
    if (needsResize) {
      result = result.resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true });
    }

    const output = await result.webp({ quality: 85 }).toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.height,
    };
  }

  async generateThumbnails(buffer: Buffer): Promise<Array<{ width: number; buffer: Buffer }>> {
    const widths = [300, 600, 1200];
    const thumbnails = await Promise.all(
      widths.map(async (w) => {
        const thumb = await sharp(buffer)
          .resize(w, undefined, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        return { width: w, buffer: thumb };
      }),
    );
    return thumbnails;
  }
}
