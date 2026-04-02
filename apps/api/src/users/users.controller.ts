import { Controller, Get, Patch, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @Req() req: Request,
    @Body() body: { name?: string; avatarUrl?: string },
  ) {
    const user = req.user as { sub: string };
    return this.usersService.updateProfile(user.sub, body);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete account (DC-7 cascade)' })
  async deleteMe(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.usersService.deleteAccount(user.sub);
  }
}
