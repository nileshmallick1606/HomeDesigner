import { Controller, Post, Get, Delete, Body, Param, Req, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('segmentation')
  @ApiOperation({ summary: 'Request room photo segmentation (SAM)' })
  async requestSegmentation(
    @Req() req: Request,
    @Body() body: { roomPhotoId: string },
  ) {
    const user = req.user as { sub: string };
    return this.aiService.requestSegmentation(user.sub, body.roomPhotoId);
  }

  @Post('visualization')
  @ApiOperation({ summary: 'Request visualization (SD + ControlNet)' })
  async requestVisualization(
    @Req() req: Request,
    @Body() body: {
      roomPhotoId: string;
      category: string;
      subCategory?: string;
      options?: Record<string, unknown>;
    },
  ) {
    const user = req.user as { sub: string };
    return this.aiService.requestVisualization(user.sub, body.roomPhotoId, body);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get AI job status' })
  async getJobStatus(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.aiService.getJobStatus(jobId);
  }

  @Get('segmentation/:roomPhotoId')
  @ApiOperation({ summary: 'Get segmentation result for a photo' })
  async getSegmentation(@Param('roomPhotoId', ParseUUIDPipe) roomPhotoId: string) {
    return this.aiService.getSegmentationResult(roomPhotoId);
  }

  @Get('designs/:designId')
  @ApiOperation({ summary: 'Get design with visualizations' })
  async getDesign(@Param('designId', ParseUUIDPipe) designId: string) {
    return this.aiService.getDesign(designId);
  }

  @Delete('designs/:designId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete design and its visualizations' })
  async deleteDesign(@Param('designId', ParseUUIDPipe) designId: string) {
    return this.aiService.deleteDesign(designId);
  }

  @Post('designs/:designId/regenerate')
  @ApiOperation({ summary: 'Regenerate visualization for a design' })
  async regenerateDesign(
    @Req() req: Request,
    @Param('designId', ParseUUIDPipe) designId: string,
  ) {
    const user = req.user as { sub: string };
    return this.aiService.regenerateDesign(user.sub, designId);
  }
}
