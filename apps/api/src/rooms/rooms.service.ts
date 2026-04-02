import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateRoomDto) {
    const maxSort = await this.prisma.room.aggregate({
      where: { projectId, deletedAt: null },
      _max: { sortOrder: true },
    });

    const room = await this.prisma.room.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        budget: dto.budget,
        notes: dto.notes,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    this.logger.log(`Room created: ${room.id} in project ${projectId}`);
    return room;
  }

  async findAllInProject(projectId: string) {
    return this.prisma.room.findMany({
      where: { projectId, deletedAt: null },
      include: {
        _count: { select: { photos: true, designs: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      include: {
        photos: { orderBy: { createdAt: 'desc' }, take: 10 },
        designs: {
          orderBy: { updatedAt: 'desc' },
          take: 10,
          include: { visualizations: { orderBy: { createdAt: 'desc' }, take: 5 } },
        },
        _count: { select: { photos: true, designs: true } },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async update(roomId: string, data: { name?: string; type?: string; budget?: number; notes?: string }) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  async softDelete(roomId: string) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(projectId: string, items: Array<{ roomId: string; sortOrder: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.room.update({
          where: { id: item.roomId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { success: true };
  }
}
