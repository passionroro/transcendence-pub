import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { UserService } from 'src/user/user.service';
import { HttpModule } from '@nestjs/axios';
import { FriendsGateway } from './friends.gateway';

@Module({
  imports: [HttpModule],
  controllers: [FriendsController],
  providers: [FriendsService, UserService, FriendsGateway],
})
export class FriendsModule {}
