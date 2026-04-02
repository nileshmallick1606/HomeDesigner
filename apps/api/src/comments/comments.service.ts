import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { projectId: string; roomId?: string; designId?: string }, page = 1, limit = 50) {
    const where: Record<string, unknown> = { projectId: filters.projectId, deletedAt: null };
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.designId) where.designId = filters.designId;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          replies: {
            where: { deletedAt: null },
            include: { author: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { data: comments, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(userId: string, data: { content: string; projectId: string; roomId?: string; designId?: string; parentId?: string }) {
    return this.prisma.comment.create({
      data: { ...data, authorId: userId },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async update(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Can only edit your own comments');
    return this.prisma.comment.update({ where: { id: commentId }, data: { content } });
  }

  async softDelete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Can only delete your own comments');
    return this.prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  }
}
