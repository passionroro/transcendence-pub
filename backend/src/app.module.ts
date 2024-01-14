import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TfaModule } from './auth/tfa/tfa.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AvatarModule } from './avatar/avatar.module';
import { FriendsModule } from './friends/friends.module';
import { HttpModule } from '@nestjs/axios';
import { ChatModule } from './chat/chat.module';
import { ChannelModule } from './channel/channel.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MuteExpirationTask } from './mute-expiration.task';
import { GameModule } from './game/game.module';
import { ChannelGateway } from './channel/channel.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    ScheduleModule.forRoot(),
    AuthModule,
    PrismaModule,
    UserModule,
    AvatarModule,
    TfaModule,
    FriendsModule,
    HttpModule,
    ChatModule,
    ChannelModule,
    GameModule,
  ],
  providers: [MuteExpirationTask, ChannelGateway],
  controllers: [],
})
export class AppModule {}
