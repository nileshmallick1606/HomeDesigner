import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../r2/r2.service';
import sharp from 'sharp';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async exportDesignImage(designId: string, format: 'jpeg' | 'png' = 'jpeg'): Promise<Buffer> {
    const viz = await this.prisma.visualization.findFirst({
      where: { designId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!viz || !viz.imageUrl) throw new NotFoundException('No completed visualization');

    const imageBuffer = await this.r2.download(viz.imageUrl.replace(/^\/api\/media\/files\//, ''));

    if (format === 'png') {
      return sharp(imageBuffer).png().toBuffer();
    }
    return sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
  }

  async exportComparison(designId: string): Promise<Buffer> {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
      include: {
        visualizations: { where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, take: 1 },
        room: { include: { photos: { take: 1, orderBy: { createdAt: 'desc' } } } },
      },
    });
    if (!design) throw new NotFoundException('Design not found');

    const viz = design.visualizations[0];
    const photo = design.room.photos[0];
    if (!viz?.imageUrl || !photo?.originalUrl) throw new NotFoundException('Missing images');

    const beforeBuf = await this.r2.download(photo.originalUrl.replace(/^(https?:\/\/[^/]+)?\/api\/media\/files\//, ''));
    const afterBuf = await this.r2.download(viz.imageUrl.replace(/^\/api\/media\/files\//, ''));

    const beforeMeta = await sharp(beforeBuf).metadata();
    const width = beforeMeta.width || 800;
    const height = beforeMeta.height || 600;

    const before = await sharp(beforeBuf).resize(width, height, { fit: 'cover' }).jpeg().toBuffer();
    const after = await sharp(afterBuf).resize(width, height, { fit: 'cover' }).jpeg().toBuffer();

    return sharp({
      create: { width: width * 2 + 20, height: height, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([
        { input: before, left: 0, top: 0 },
        { input: after, left: width + 20, top: 0 },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();
  }
}
