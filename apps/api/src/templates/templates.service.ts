import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
