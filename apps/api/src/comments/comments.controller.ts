import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { CommentsService } from './comments.service';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'List comments' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'designId', required: false })
  async findAll(
    @Query('projectId') projectId: string,
    @Query('roomId') roomId?: string,
    @Query('designId') designId?: string,
    @Query('page') page?: number,
  ) {
    return this.commentsService.findAll({ projectId, roomId, designId }, page || 1);
  }

  @Post()
  @ApiOperation({ summary: 'Create comment' })
  async create(@Req() req: Request, @Body() body: { content: string; projectId: string; roomId?: string; designId?: string; parentId?: string }) {
    const user = req.user as { sub: string };
    return this.commentsService.create(user.sub, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit comment' })
  async update(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() body: { content: string }) {
    const user = req.user as { sub: string };
    return this.commentsService.update(id, user.sub, body.content);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  async remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as { sub: string };
    return this.commentsService.softDelete(id, user.sub);
  }
}
