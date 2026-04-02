import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller()
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get('projects/:id/budget')
  @ApiOperation({ summary: 'Get project budget summary' })
  async getProjectBudget(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.getProjectBudget(id);
  }

  @Get('rooms/:id/budget')
  @ApiOperation({ summary: 'Get room budget by category' })
  async getRoomBudget(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.getRoomBudget(id);
  }

  @Post('rooms/:roomId/budget/items')
  @ApiOperation({ summary: 'Add/update budget item' })
  async upsertBudgetItem(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: { category: string; estimatedAmount?: number; actualAmount?: number; notes?: string },
  ) {
    return this.budgetsService.upsertBudgetItem(roomId, body.category, body);
  }

  @Delete('budgets/items/:id')
  @ApiOperation({ summary: 'Delete budget item' })
  async deleteBudgetItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetsService.deleteBudgetItem(id);
  }
}
