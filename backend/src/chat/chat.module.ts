import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { HttpModule } from '@nestjs/axios';
import { UserService } from 'src/user/user.service';
import { ChatGateway } from './chat.gateway';
import { AuthService } from 'src/auth/auth.service';

@Module({
  providers: [ChatService, UserService, ChatGateway, AuthService],
  controllers: [ChatController],
  imports: [HttpModule],
})
export class ChatModule {}
