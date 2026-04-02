import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async findAll(filters: { roomType?: string; category?: string; search?: string }, page = 1, limit = 20) {
    const where: Record<string, unknown> = {};
    if (filters.roomType) where.roomType = filters.roomType;
    if (filters.category) where.category = filters.category;
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.template.count({ where }),
    ]);

    return { data: templates, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async getFeatured() {
    return this.prisma.template.findMany({
      where: { isSystem: true },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });
  }

  async applyTemplate(templateId: string, roomId: string, userId: string) {
    // 1. Fetch template
    const template = await this.prisma.template.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');

    // 2. Fetch room with photos
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { photos: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.photos.length === 0) {
      throw new BadRequestException('This room has no photos. Upload a photo first.');
    }

    // 3. Create design via AI service
    const result = await this.aiService.requestVisualization(userId, room.photos[0].id, {
      category: template.category,
      subCategory: template.subCategory || undefined,
    });

    // 4. Copy template canvasState to design if exists
    if (template.canvasState) {
      await this.prisma.design.update({
        where: { id: result.designId },
        data: { canvasState: template.canvasState as any },
      });
    }

    return {
      jobId: result.jobId,
      designId: result.designId,
      roomId: room.id,
      projectId: room.projectId,
    };
  }
}
