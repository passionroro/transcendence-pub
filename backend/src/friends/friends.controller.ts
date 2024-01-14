import { Controller, Get, Post, Param, Delete, UseGuards, Req, Body } from '@nestjs/common';
import { Request } from 'express';
import { FriendsService } from './friends.service';
import { AuthGuard } from 'src/auth/guard';
import { ChangeUsernameDto, FriendDto } from './friends.dto';  

@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Post('sendRequest')
  async addFriend(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.addFriend(req, body);
  }

  @Post('cancelRequest')
  async cancelRequest(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.cancelRequest(req, body);
  }

  @Post('acceptRequest')
  async acceptRequest(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.acceptRequest(req, body);
  }

  @Post('declineRequest')
  async declineRequest(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.declineRequest(req, body);
  }

  @Post('block')
  async block(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.block(req, body);
  }

  @Post('unblock')
  async unblock(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.unblock(req, body);
  }

  @Get('list')
  async findAllFriends(@Req() req: Request) {
    return await this.friends.findAllFriends(req);
  }

  @Get('all')
  async findAllUsers(@Req() req: Request) {
    return await this.friends.findAllUsers(req);
  }

  @Post('chat')
  async findChat(@Req() req: Request, @Body() body: FriendDto) {
    return await this.friends.findChat(req, body);
  }

  @Get('isfriend/:id')
  async isFriend(@Req() req: Request, @Param('id') id: string) {
    return this.friends.isFriend(req, id);
  }

  @Get('isRequestSent/:id')
  async isRequested(@Req() req: Request, @Param('id') id: string) {
    return this.friends.isRequestSent(req, id);
  }

  @Get('isRequestReceived/:id')
  async isRequestReceived(@Req() req: Request, @Param('id') id: string) {
    return this.friends.isRequestReceived(req, id);
  }

  @Get('isBlocked/:id')
  async isBlocked(@Req() req: Request, @Param('id') id: string) {
    return this.friends.isBlocked(req, id);
  }

  @Get('isBlocking/:id')
  async isBlocking(@Req() req: Request, @Param('id') id: string) {
    return this.friends.isBlocking(req, id);
  }

  @Get(':id')
  async userData(@Param('id') id: string) {
    return this.friends.userData(id);
  }

  @Delete(':id')
  async unfriend(@Req() req: Request, @Param('id') id: string) {
    return await this.friends.unfriend(req, id, 1);
  }

  @Post('changeUsername')
  async changeUsername(@Req() req: Request, @Body() dto: ChangeUsernameDto) {
    return await this.friends.changeUsername(req, dto.username);
  }
}
