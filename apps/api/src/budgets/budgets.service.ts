import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectBudget(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { overallBudget: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const roomBudgets = await this.prisma.roomBudget.findMany({
      where: { room: { projectId } },
    });

    const byCategory: Record<string, { estimated: number; actual: number }> = {};
    let totalEstimated = 0;
    let totalActual = 0;

    for (const rb of roomBudgets) {
      const cat = rb.category;
      if (!byCategory[cat]) byCategory[cat] = { estimated: 0, actual: 0 };
      byCategory[cat].estimated += Number(rb.estimatedAmount);
      byCategory[cat].actual += Number(rb.actualAmount);
      totalEstimated += Number(rb.estimatedAmount);
      totalActual += Number(rb.actualAmount);
    }

    return {
      overallBudget: Number(project.overallBudget || 0),
      totalEstimated,
      totalActual,
      byCategory,
      percentSpent: totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0,
    };
  }

  async getRoomBudget(roomId: string) {
    return this.prisma.roomBudget.findMany({
      where: { roomId },
      orderBy: { category: 'asc' },
    });
  }

  async upsertBudgetItem(roomId: string, category: string, data: { estimatedAmount?: number; actualAmount?: number; notes?: string }) {
    const existing = await this.prisma.roomBudget.findFirst({
      where: { roomId, category: category as any },
    });

    if (existing) {
      return this.prisma.roomBudget.update({
        where: { id: existing.id },
        data: {
          ...(data.estimatedAmount !== undefined && { estimatedAmount: data.estimatedAmount }),
          ...(data.actualAmount !== undefined && { actualAmount: data.actualAmount }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      });
    }

    return this.prisma.roomBudget.create({
      data: {
        roomId,
        category: category as any,
        estimatedAmount: data.estimatedAmount || 0,
        actualAmount: data.actualAmount || 0,
        notes: data.notes,
      },
    });
  }

  async deleteBudgetItem(id: string) {
    return this.prisma.roomBudget.delete({ where: { id } });
  }
}
