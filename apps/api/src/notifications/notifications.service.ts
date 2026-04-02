import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data: notifications, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  async create(userId: string, type: string, title: string, body?: string, metadata?: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: type as 'SHARE_INVITE' | 'COMMENT' | 'AI_COMPLETE' | 'PROJECT_UPDATE',
        title,
        body,
        ...(metadata && { data: metadata as any }),
      },
    });
  }
}
