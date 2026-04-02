import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
}
