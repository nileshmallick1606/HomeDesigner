import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        profileType: true,
        platformRole: true,
        emailVerified: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(userId: string, updates: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        profileType: true,
        platformRole: true,
        preferences: true,
      },
    });
  }

  async deleteAccount(userId: string) {
    // DC-7: Cascade delete all user data
    this.logger.warn(`Initiating account deletion for user ${userId}`);

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete user
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), refreshToken: null },
      });

      // Delete notifications
      await tx.notification.deleteMany({ where: { userId } });

      // Delete comments
      await tx.comment.deleteMany({ where: { authorId: userId } });

      // Remove from project memberships
      await tx.projectMember.deleteMany({ where: { userId } });

      // Remove from org memberships
      await tx.orgMember.deleteMany({ where: { userId } });
    });

    this.logger.log(`Account deletion initiated for user ${userId}`);
    return { message: 'Account deletion initiated. Data will be purged within 30 days.' };
  }
}
