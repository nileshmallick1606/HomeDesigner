import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  async create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as { sub: string };
    return this.projectsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const user = req.user as { sub: string };
    return this.projectsService.findAllForUser(user.sub, page || 1, limit || 20, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as { sub: string };
    return this.projectsService.findById(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const user = req.user as { sub: string };
    return this.projectsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project (soft)' })
  async remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as { sub: string };
    return this.projectsService.softDelete(id, user.sub);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to project' })
  async addMember(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email: string; role: 'EDITOR' | 'VIEWER' },
  ) {
    const user = req.user as { sub: string };
    return this.projectsService.addMember(id, user.sub, body.email, body.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from project' })
  async removeMember(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const user = req.user as { sub: string };
    return this.projectsService.removeMember(id, user.sub, userId);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Acquire project lock (DC-8)' })
  async acquireLock(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as { sub: string };
    return this.projectsService.acquireLock(id, user.sub);
  }

  @Delete(':id/lock')
  @ApiOperation({ summary: 'Release project lock' })
  async releaseLock(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as { sub: string };
    return this.projectsService.releaseLock(id, user.sub);
  }

  @Get(':id/lock')
  @ApiOperation({ summary: 'Get lock status' })
  async getLockStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getLockStatus(id);
  }
}
