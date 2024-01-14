import { Module } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { AvatarController } from './avatar.controller';
import { UserService } from 'src/user/user.service';
import { HttpModule } from '@nestjs/axios';
import { AvatarGateway } from './avatar.gateway';

@Module({
  imports: [HttpModule],
  providers: [AvatarService, UserService, AvatarGateway],
  controllers: [AvatarController],
})
export class AvatarModule {}
