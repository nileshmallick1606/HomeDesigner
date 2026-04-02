import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@ApiTags('Rooms')
@ApiBearerAuth()
@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('projects/:projectId/rooms')
  @ApiOperation({ summary: 'Create room in project' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(projectId, dto);
  }

  @Get('projects/:projectId/rooms')
  @ApiOperation({ summary: 'List rooms in project' })
  async findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.roomsService.findAllInProject(projectId);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.findById(id);
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Update room' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { name?: string; budget?: number; notes?: string },
  ) {
    return this.roomsService.update(id, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete room (soft)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.softDelete(id);
  }

  @Patch('projects/:projectId/rooms/reorder')
  @ApiOperation({ summary: 'Reorder rooms' })
  async reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { items: Array<{ roomId: string; sortOrder: number }> },
  ) {
    return this.roomsService.reorder(projectId, body.items);
  }
}
