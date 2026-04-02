import { Controller, Get, Post, Param, Query, Body, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TemplatesService } from './templates.service';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List design templates' })
  @ApiQuery({ name: 'roomType', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  async findAll(
    @Query('roomType') roomType?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
  ) {
    return this.templatesService.findAll({ roomType, category, search }, page || 1);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured templates' })
  async getFeatured() {
    return this.templatesService.getFeatured();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findById(id);
  }

  @Post(':templateId/apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply template to a room' })
  async applyTemplate(
    @Req() req: Request,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() body: { roomId: string },
  ) {
    const user = req.user as { sub: string };
    return this.templatesService.applyTemplate(templateId, body.roomId, user.sub);
  }
}
