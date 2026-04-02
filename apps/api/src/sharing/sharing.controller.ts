import { Controller, Post, Get, Delete, Body, Param, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SharingService } from './sharing.service';
import { Public } from '../auth/guards/public.decorator';

@ApiTags('Sharing')
@Controller()
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post('projects/:id/share')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create share link' })
  async createShareLink(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: 'VIEWER' | 'EDITOR'; expiresInDays?: number },
  ) {
    const user = req.user as { sub: string };
    return this.sharingService.createShareLink(id, user.sub, body.role, body.expiresInDays);
  }

  @Public()
  @Get('share/:token')
  @ApiOperation({ summary: 'Join via share link' })
  async joinViaShareLink(@Param('token') token: string, @Req() req: Request) {
    const user = req.user as { sub: string } | undefined;
    if (!user) return { requiresAuth: true, token };
    return this.sharingService.joinViaShareLink(token, user.sub);
  }

  @Get('projects/:id/share')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List share links' })
  async listShareLinks(@Param('id', ParseUUIDPipe) id: string) {
    return this.sharingService.listShareLinks(id);
  }

  @Delete('projects/:id/share/:linkId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke share link' })
  async revokeShareLink(
    @Req() req: Request,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    const user = req.user as { sub: string };
    return this.sharingService.revokeShareLink(linkId, user.sub);
  }
}
