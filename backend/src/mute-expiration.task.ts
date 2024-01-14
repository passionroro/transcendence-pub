import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { ChannelGateway } from './channel/channel.gateway';
import { NotificationI } from './interfaces';

@Injectable()
export class MuteExpirationTask {

  constructor(
    private prisma: PrismaService,
    private socket: ChannelGateway) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    // find all mutedUsers where the mute expires in the past
    const mutedUsers = await this.prisma.mutedUser.findMany({
      where: {
        muteExpiration: {
          lte: new Date()
        }
      },
      include: {
        user: true,
        chat: true
      }
    });

    // unmute all users by deleting the mutedUser record
    mutedUsers.forEach(async mutedUser => {
      this.socket.emitRefreshValues();
      const notification: NotificationI = {
        message: 'You were unmuted in the chat ' + mutedUser.chat.name + '.',
        link: '/chat/' + mutedUser.chat.id,
      };
      this.socket.sendNotification(mutedUser.user.socketId, notification);
      await this.prisma.mutedUser.delete({
        where: {
          id: mutedUser.id
        }
      });
    });
  }
}
