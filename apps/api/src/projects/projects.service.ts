import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
const PROJECT_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (DC-8)

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        overallBudget: dto.overallBudget,
        timelineStart: dto.timelineStart ? new Date(dto.timelineStart) : undefined,
        timelineEnd: dto.timelineEnd ? new Date(dto.timelineEnd) : undefined,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { members: true },
    });

    this.logger.log(`Project created: ${project.id} by user ${userId}`);
    return project;
  }

  async findAllForUser(userId: string, page = 1, limit = 20, search?: string) {
    const where = {
      deletedAt: null,
      members: { some: { userId } },
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          _count: { select: { rooms: true } },
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        members: { some: { userId } },
      },
      include: {
        rooms: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { rooms: true, comments: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    await this.assertMemberRole(projectId, userId, ['OWNER', 'EDITOR']);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.overallBudget !== undefined && { overallBudget: dto.overallBudget }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.timelineStart !== undefined && { timelineStart: new Date(dto.timelineStart) }),
        ...(dto.timelineEnd !== undefined && { timelineEnd: new Date(dto.timelineEnd) }),
      },
    });
  }

  async softDelete(projectId: string, userId: string) {
    await this.assertMemberRole(projectId, userId, ['OWNER']);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  async addMember(projectId: string, userId: string, targetEmail: string, role: 'EDITOR' | 'VIEWER') {
    await this.assertMemberRole(projectId, userId, ['OWNER']);

    const targetUser = await this.prisma.user.findUnique({ where: { email: targetEmail } });
    if (!targetUser) {
      throw new NotFoundException('User not found with that email');
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUser.id } },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    return this.prisma.projectMember.create({
      data: { projectId, userId: targetUser.id, role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async removeMember(projectId: string, userId: string, targetUserId: string) {
    await this.assertMemberRole(projectId, userId, ['OWNER']);

    if (userId === targetUserId) {
      const ownerCount = await this.prisma.projectMember.count({
        where: { projectId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner');
      }
    }

    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  }

  // DC-8: Project locking
  async acquireLock(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { lockedBy: true, lockedAt: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (project.lockedBy && project.lockedAt) {
      const elapsed = Date.now() - project.lockedAt.getTime();
      if (elapsed < PROJECT_LOCK_TIMEOUT_MS && project.lockedBy !== userId) {
        throw new ConflictException('Project is locked by another user');
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { lockedBy: userId, lockedAt: new Date() },
    });
  }

  async releaseLock(projectId: string, userId: string) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { lockedBy: null, lockedAt: null },
    });
  }

  async getLockStatus(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { lockedBy: true, lockedAt: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (!project.lockedBy || !project.lockedAt) {
      return { locked: false };
    }

    const elapsed = Date.now() - project.lockedAt.getTime();
    if (elapsed >= PROJECT_LOCK_TIMEOUT_MS) {
      return { locked: false };
    }

    return {
      locked: true,
      lockedBy: project.lockedBy,
      remainingMs: PROJECT_LOCK_TIMEOUT_MS - elapsed,
    };
  }

  private async assertMemberRole(projectId: string, userId: string, allowedRoles: string[]) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
