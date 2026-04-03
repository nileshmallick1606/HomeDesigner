import { Controller, Get, Param, Query, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('design/:designId/image')
  @ApiOperation({ summary: 'Download visualization image' })
  async exportImage(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Query('format') format: 'jpeg' | 'png' = 'jpeg',
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportDesignImage(designId, format);
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=design-${designId}.${format}`);
    res.send(buffer);
  }

  @Get('design/:designId/comparison')
  @ApiOperation({ summary: 'Download before/after comparison image' })
  async exportComparison(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportComparison(designId);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename=comparison-${designId}.jpg`);
    res.send(buffer);
  }

  @Get('project/:projectId/pdf')
  @ApiOperation({ summary: 'Download project summary as PDF' })
  async exportProjectPdf(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportProjectPdf(projectId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}.pdf`);
    res.send(buffer);
  }
}
