import { Controller, Get, Req, UseGuards, Param } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from 'src/auth/guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('list')
  async list(@Req() req: Request) {
    return await this.chatService.list(req);
  }

  @Get('data/:id')
  async getData(@Param('id') id: string) {
    return await this.chatService.getData(id);
  }

  @Get('friendswithoutchat')
  async friendsWithoutChat(@Req() req: Request) {
    return await this.chatService.friendsWithoutChat(req);
  }

  @Get(':id/messages')
  async getChatMessages(@Req() req: Request, @Param('id') id: string) {
    return await this.chatService.getMessages(+id, (req.user as any).sub);
  }
}
