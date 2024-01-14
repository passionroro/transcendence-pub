import { Module } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { UserService } from 'src/user/user.service';
import { HttpModule } from '@nestjs/axios';
import { ChannelGateway } from './channel.gateway';

@Module({
  controllers: [ChannelController],
  providers: [ChannelService, UserService, ChannelGateway],
  imports: [HttpModule],
})
export class ChannelModule {}
