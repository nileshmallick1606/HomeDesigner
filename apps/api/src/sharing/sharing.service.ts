import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  async createShareLink(projectId: string, userId: string, role: 'VIEWER' | 'EDITOR', expiresInDays?: number) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    return this.prisma.shareLink.create({
      data: { projectId, token, role, expiresAt, createdById: userId },
    });
  }

  async joinViaShareLink(token: string, userId: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { token } });
    if (!link) throw new NotFoundException('Invalid share link');
    if (link.expiresAt && link.expiresAt < new Date()) throw new ForbiddenException('Share link expired');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: link.projectId, userId } },
    });
    if (existing) return { message: 'Already a member', projectId: link.projectId };

    await this.prisma.projectMember.create({
      data: { projectId: link.projectId, userId, role: link.role },
    });

    return { message: 'Joined project', projectId: link.projectId, role: link.role };
  }

  async revokeShareLink(linkId: string, userId: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { id: linkId }, include: { project: true } });
    if (!link) throw new NotFoundException('Share link not found');
    if (link.project.ownerId !== userId) throw new ForbiddenException('Only project owner can revoke');
    return this.prisma.shareLink.delete({ where: { id: linkId } });
  }

  async listShareLinks(projectId: string) {
    return this.prisma.shareLink.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  }
}
