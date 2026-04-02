import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

const AI_RATE_LIMITS = { FREE_DAILY: 10, PAID_DAILY: 50 };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('segmentation') private readonly segmentationQueue: Queue,
    @InjectQueue('visualization') private readonly visualizationQueue: Queue,
  ) {}

  async requestSegmentation(userId: string, roomPhotoId: string) {
    // Check rate limit (DC-4)
    await this.checkRateLimit(userId);

    // Validate photo exists
    const photo = await this.prisma.roomPhoto.findUnique({ where: { id: roomPhotoId } });
    if (!photo) throw new NotFoundException('Photo not found');

    // Create AiJob record
    const job = await this.prisma.aiJob.create({
      data: {
        type: 'SEGMENTATION',
        status: 'QUEUED',
        priority: await this.getUserPriority(userId),
        userId,
        roomPhotoId,
      },
    });

    // Enqueue BullMQ job (DC-1: async processing)
    await this.segmentationQueue.add(
      'segment',
      { jobId: job.id, roomPhotoId, userId },
      { priority: job.priority, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(`Segmentation queued: ${job.id} for photo ${roomPhotoId}`);
    return { jobId: job.id, status: 'QUEUED' };
  }

  async requestVisualization(
    userId: string,
    roomPhotoId: string,
    designData: { category: string; subCategory?: string; options?: Record<string, unknown>; preset?: 'draft' | 'final' },
  ) {
    await this.checkRateLimit(userId);

    // Create Design record
    const design = await this.prisma.design.create({
      data: {
        roomId: (await this.prisma.roomPhoto.findUniqueOrThrow({ where: { id: roomPhotoId } })).roomId,
        name: `${designData.category} Design`,
        category: designData.category as 'CIVIL' | 'FURNISHINGS' | 'BATHROOM_CAT' | 'KITCHEN_CAT' | 'ELECTRICAL' | 'OTHER',
        subCategory: designData.subCategory,
      },
    });

    // Create AiJob
    const job = await this.prisma.aiJob.create({
      data: {
        type: 'VISUALIZATION',
        status: 'QUEUED',
        priority: await this.getUserPriority(userId),
        userId,
        roomPhotoId,
        designId: design.id,
      },
    });

    // Enqueue
    await this.visualizationQueue.add(
      'visualize',
      { jobId: job.id, roomPhotoId, designId: design.id, userId, ...designData },
      { priority: job.priority, attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );

    this.logger.log(`Visualization queued: ${job.id}`);
    return { jobId: job.id, designId: design.id, status: 'QUEUED' };
  }

  async getJobStatus(jobId: string) {
    const job = await this.prisma.aiJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  async getSegmentationResult(roomPhotoId: string) {
    return this.prisma.segmentation.findFirst({
      where: { roomPhotoId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDesignCanvasState(designId: string, canvasState?: Record<string, unknown>) {
    const design = await this.prisma.design.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException('Design not found');

    return this.prisma.design.update({
      where: { id: designId },
      data: { canvasState: (canvasState as any) || undefined, version: { increment: 1 } },
      select: { id: true, version: true },
    });
  }

  async getDesign(designId: string) {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
      include: {
        visualizations: { orderBy: { createdAt: 'desc' } },
        room: { select: { id: true, name: true, projectId: true, photos: { take: 1, orderBy: { createdAt: 'desc' } } } },
      },
    });
    if (!design) throw new NotFoundException('Design not found');
    return design;
  }

  async deleteDesign(designId: string) {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
      include: { visualizations: true },
    });
    if (!design) throw new NotFoundException('Design not found');

    // Delete visualizations first, then design
    await this.prisma.visualization.deleteMany({ where: { designId } });
    await this.prisma.aiJob.deleteMany({ where: { designId } });
    await this.prisma.design.delete({ where: { id: designId } });

    this.logger.log(`Design deleted: ${designId}`);
    return { success: true };
  }

  async regenerateDesign(userId: string, designId: string) {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
      include: { room: { select: { photos: { take: 1, orderBy: { createdAt: 'desc' } } } } },
    });
    if (!design) throw new NotFoundException('Design not found');
    if (!design.room.photos[0]) throw new BadRequestException('No photos in room');

    await this.checkRateLimit(userId);

    const job = await this.prisma.aiJob.create({
      data: {
        type: 'VISUALIZATION',
        status: 'QUEUED',
        priority: await this.getUserPriority(userId),
        userId,
        roomPhotoId: design.room.photos[0].id,
        designId,
      },
    });

    await this.visualizationQueue.add(
      'visualize',
      { jobId: job.id, roomPhotoId: design.room.photos[0].id, designId, userId, category: design.category },
      { priority: job.priority, attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );

    this.logger.log(`Regeneration queued: ${job.id} for design ${designId}`);
    return { jobId: job.id, designId, status: 'QUEUED' };
  }

  private async checkRateLimit(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.aiJob.count({
      where: { userId, createdAt: { gte: today } },
    });

    const limit = user.platformRole === 'FREE_USER' ? AI_RATE_LIMITS.FREE_DAILY : AI_RATE_LIMITS.PAID_DAILY;

    if (count >= limit) {
      throw new BadRequestException(`Daily AI generation limit reached (${limit}/day). Upgrade for more.`);
    }
  }

  private async getUserPriority(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.platformRole === 'FREE_USER' ? 10 : 1; // Lower = higher priority
  }
}
