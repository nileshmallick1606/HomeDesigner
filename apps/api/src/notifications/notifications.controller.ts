import { Controller, Get, Patch, Param, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  async findAll(@Req() req: Request, @Query('page') page?: number) {
    const user = req.user as { sub: string };
    return this.notificationsService.findAllForUser(user.sub, page || 1);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: Request) {
    const user = req.user as { sub: string };
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  async markAllRead(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.notificationsService.markAllRead(user.sub);
  }
}
