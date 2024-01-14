import { Controller, Get, Param, Post, Req, UseGuards, Body } from '@nestjs/common';
import { Request } from 'express';
import { ChannelService } from './channel.service';
import { AuthGuard } from 'src/auth/guard';
import {
  CreateChannelDto,
  JoinChannelDto,
  ChangePasswordDto,
  ChangeNameDto,
  MuteDto,
  IdDto,
} from './channel.dto';

@Controller('channel')
@UseGuards(AuthGuard)
export class ChannelController {

  constructor(private channelService: ChannelService) { }

  @Post('create')
  async createChannel(@Req() req: Request, @Body() dto: CreateChannelDto) {
    return await this.channelService.createChannel(req, dto);
  }

  @Get('get-public')
  async getPublicChannels(@Req() req: Request) {
    return await this.channelService.getPublicChannels(req);
  }

  @Get('get-protected')
  async getProtectedChannels(@Req() req: Request) {
    return await this.channelService.getProtectedChannels(req);
  }

  @Get('get-invited')
  async getInvitedChannels(@Req() req: Request) {
    return await this.channelService.getInvitedChannels(req);
  }

  @Post('join')
  async joinChannel(@Req() req: Request, @Body() dto: JoinChannelDto) {
    return await this.channelService.joinChannel(req, dto);
  }

  @Post('changepassword/:id')
  async changePassword(@Req() req: Request, @Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return await this.channelService.changePassword(req, id, dto);
  }

  @Post('make-public/:id')
  async makeChannelPublic(@Req() req: Request, @Param('id') id: string) {
    return await this.channelService.makeChannelPublic(req, id);
  }

  @Post('make-private/:id')
  async makeChannelPrivate(@Req() req: Request, @Param('id') id: string) {
    return await this.channelService.makeChannelPrivate(req, id);
  }

  @Post('delete/:id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    return await this.channelService.delete(req, id);
  }

  @Post('leave/:id')
  async leave(@Req() req: Request, @Param('id') id: string) {
    return await this.channelService.leave(req, id);
  }

  @Post('changename/:id')
  async changeName(@Req() req: Request, @Param('id') id: string, @Body() dto: ChangeNameDto) {
    return await this.channelService.changeName(req, id, dto);
  }

  @Post('invite/:id')
  async invite(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.invite(req, id, dto);
  }

  @Post('uninvite/:id')
  async uninvite(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.uninvite(req, id, dto);
  }

  @Post('add-admin/:id')
  async addAdmin(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.addAdmin(req, id, dto);
  }

  @Post('remove-admin/:id')
  async removeAdmin(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.removeAdmin(req, id, dto);
  }

  @Post('kick/:id')
  async kick(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.kick(req, id, dto, 1);
  }

  @Post('ban/:id')
  async ban(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.ban(req, id, dto);
  }

  @Post('unban/:id')
  async unban(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.unban(req, id, dto);
  }

  @Post('mute/:id')
  async mute(@Req() req: Request, @Param('id') id: string, @Body() dto: MuteDto) {
    return await this.channelService.mute(req, id, dto);
  }

  @Post('unmute/:id')
  async unmute(@Req() req: Request, @Param('id') id: string, @Body() dto: IdDto) {
    return await this.channelService.unmute(req, id, dto);
  }
}
