import { Controller, Post, Get, Body, Param, Req, ParseUUIDPipe } from '@nestjs/common';
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
}
