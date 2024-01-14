import { Injectable, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateChannelDto, JoinChannelDto, ChangeNameDto, ChangePasswordDto, MuteDto, IdDto } from './channel.dto';
import * as bcrypt from 'bcrypt';
import { ChannelGateway } from './channel.gateway';
import { NotificationI } from 'src/interfaces';

@Injectable()
export class ChannelService {

  constructor(
    private prisma: PrismaService,
    private socket: ChannelGateway,
  ) { }

  async createChannel(@Req() req: Request, info: CreateChannelDto) {

    const user = await this.prisma.user.findUnique({ where: { id: parseInt((req.user as any).sub) } });
    if (!user) {
      return { err: 'User not found' };
    }

    const channel = await this.prisma.chat.create({
      data: {
        name: info.name,
        type: info.type,
        creatorId: user.id,
        users: {
          connect: {
            id: user.id,
          },
        },
        admins: {
          connect: {
            id: user.id,
          },
        },
        rootUser: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    if (info.type === 'PROTECTED' && info.password) {
      const hash = await this.hashPassword(info.password);
      await this.prisma.chat.update({
        where: { id: channel.id },
        data: {
          password: hash,
        },
      });
    }

    if (info.type === 'PRIVATE') {
      // invite users
      for (const userId of info.invited) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          return { err: 'User not found' };
        }

        await this.prisma.chat.update({
          where: { id: channel.id },
          data: {
            invited: {
              connect: {
                id: user.id,
              },
            },
          },
        });

        const notification: NotificationI = {
          message: user.login + ' invited you to a private chat: ' + channel.name + '.',
          link: '/join-channel',
        };
        this.socket.sendNotification(user.socketId, notification);
      }
    }

    this.socket.emitRefreshValues();

    return { msg: 'Channel created', channel };
  }

  async getPublicChannels(@Req() req: Request) {
    // get all public channels that I am not in
    const channels = await this.prisma.chat.findMany({
      where: {
        type: 'PUBLIC',
        users: {
          none: {
            id: (req.user as any).sub,
          },
        },
      },
      include: {
        users: true,
        admins: true,
        banned: {
          where: { id: (req.user as any).sub },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // filter out channels that I am banned from
    const filteredChannels = channels.filter(channel => {
      return channel.banned.filter(banned => banned.id === (req.user as any).sub).length === 0;
    });

    // map channels to remove password
    const mappedChannels = filteredChannels.map(channel => {
      const { password, ...rest } = channel;
      return rest;
    });

    return mappedChannels;
  }

  async getProtectedChannels(@Req() req: Request) {
    // get all protected channels that I am not in
    const channels = await this.prisma.chat.findMany({
      where: {
        type: 'PROTECTED',
        users: {
          none: {
            id: (req.user as any).sub,
          },
        },
      },
      include: {
        users: true,
        admins: true,
        banned: {
          where: { id: (req.user as any).sub },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // filter out channels that I am banned from
    const filteredChannels = channels.filter(channel => {
      return channel.banned.filter(banned => banned.id === (req.user as any).sub).length === 0;
    });

    // map channels to remove password
    const mappedChannels = filteredChannels.map(channel => {
      const { password, ...rest } = channel;
      return rest;
    });

    return mappedChannels;
  }

  async getInvitedChannels(@Req() req: Request) {
    // get all private channels that I am invited to
    const channels = await this.prisma.chat.findMany({
      where: {
        type: 'PRIVATE',
        invited: {
          some: {
            id: (req.user as any).sub,
          },
        },
      },
      include: {
        users: true,
        admins: true,
        banned: {
          where: { id: (req.user as any).sub },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // filter out channels that I am banned from
    const filteredChannels = channels.filter(channel => {
      return channel.banned.filter(banned => banned.id === (req.user as any).sub).length === 0;
    });

    // map channels to remove password
    const mappedChannels = filteredChannels.map(channel => {
      const { password, ...rest } = channel;
      return rest;
    });

    return mappedChannels;
  }

  async joinChannel(@Req() req: Request, info: JoinChannelDto) {

    const user = await this.prisma.user.findUnique({ where: { id: parseInt((req.user as any).sub) } });
    if (!user) {
      return { err: 'User not found' };
    }

    const channel = await this.prisma.chat.findUnique({
      where: { id: info.id },
      include: {
        users: true,
        admins: true,
        banned: {
          where: { id: user.id },
        },
      },
    });
    if (!channel) {
      return { err: 'Channel not found' };
    }

    // check if the user is banned
    if (channel.banned.filter(banned => banned.id === user.id).length > 0) {
      return { err: 'You are banned from this channel' };
    }

    if (channel.type === 'PUBLIC') {
      await this.prisma.chat.update({
        where: { id: channel.id },
        data: {
          users: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    } else if (channel.type === 'PROTECTED') {
      if (await this.checkPassword(info.password, channel.password) === false) {
        return { err: 'Wrong password' };
      }

      await this.prisma.chat.update({
        where: { id: channel.id },
        data: {
          users: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    } else if (channel.type === 'PRIVATE') {
      // check if the user is in the invited list of the chat
      const userInInvited = await this.prisma.chat.findUnique({
        where: { id: channel.id },
        select: {
          invited: {
            where: { id: user.id },
          },
        },
      });

      if (!userInInvited) {
        return { err: 'You are not invited to this channel' };
      }

      await this.prisma.chat.update({
        where: { id: channel.id },
        data: {
          users: {
            connect: {
              id: user.id,
            },
          },
          invited: {
            disconnect: {
              id: user.id,
            },
          },
        },
      });
    }

    this.socket.emitRefreshValues();

    return { msg: 'Channel joined', err: null };
  }

  // change the chat's password or create if there was none
  async changePassword(req: Request, id: string, info: ChangePasswordDto) {

    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
    });

    if (!chat) {
      return null;
    }

    if (chat.rootUserId !== (req.user as any).sub) {
      return { error : 'You are not the root user' };
    }

    const hash = await this.hashPassword(info.password);
    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        password: hash,
      },
    });

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        type: 'PROTECTED',
      },
    });

    this.socket.emitRefreshValues();

    return { success: 'Password updated successfully' };
  }

  // remove the chat's password
  async makeChannelPublic(req: Request, id: string) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
    });

    if (!chat) {
      return null;
    }

    if (chat.rootUserId !== (req.user as any).sub) {
      return { error : 'You are not the root user' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        password: null,
      },
    });

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        type: 'PUBLIC',
      },
    });

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        invited: {
          disconnect: [],
        },
      },
    });

    this.socket.emitRefreshValues();

    return { success: 'Chat is now public' };
  }

  // make channel private
  async makeChannelPrivate(req: Request, id: string) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (chat.rootUserId !== (req.user as any).sub) {
      return { error : 'You are not the root user' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        type: 'PRIVATE',
        password: null,
        invited: {
          disconnect: [],
        },
      },
    });

    this.socket.emitRefreshValues();

    return { success: 'Chat is now private' };
  }

  // delete a chat
  async delete(req: Request, id: string) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
    });

    if (!chat) {
      return null;
    }

    if (chat.rootUserId !== (req.user as any).sub) {
      return { error : 'You are not the root user' };
    }
    
    // delete all messages, users, admins, muted users, invited users, banned users
    await this.prisma.message.deleteMany({
      where: {
        chatId: +id,
      },
    });

    await this.prisma.mutedUser.deleteMany({
      where: {
        chatId: +id,
      },
    });

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        users: {
          disconnect: [],
        },
        admins: {
          disconnect: [],
        },
        invited: {
          disconnect: [],
        },
        banned: {
          disconnect: [],
        },
      },
    });

    await this.prisma.chat.delete({
      where: {
        id: +id,
      },
    });

    this.socket.emitRefreshValues();

    return { success: 'Chat deleted successfully' };
  }

  // leave a chat
  async leave(req: Request, id: string) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        users: true,
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    // delete muted user record
    await this.prisma.mutedUser.deleteMany({
      where: {
        chatId: +id,
        userId: (req.user as any).sub,
      },
    });

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        users: {
          disconnect: {
            id: (req.user as any).sub,
          },
        },
        admins: {
          disconnect: {
            id: (req.user as any).sub,
          },
        },
      },
    });

    const updatedChat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        users: true,
        admins: true,
      },
    });
    
    // if the user is the root user make the first admin the new root user
    // if there are no admins make the first user the new root user
    if (updatedChat.rootUserId === (req.user as any).sub) {
      if (updatedChat.admins.length > 0) {
        await this.prisma.chat.update({
          where: {
            id: +id,
          },
          data: {
            rootUserId: updatedChat.admins[0].id,
          },
        });
      } else if (updatedChat.users.length > 0) {
        await this.prisma.chat.update({
          where: {
            id: +id,
          },
          data: {
            rootUserId: updatedChat.users[0].id,
            admins: {
              connect: {
                id: updatedChat.users[0].id,
              },
            },
          },
        });
      } else {
        return await this.delete(req, id);
      }
    }

    this.socket.emitRefreshValues();

    return { success: 'Left chat successfully' };
  }

  // change the chat's name
  async changeName(req: Request, id: string, info: ChangeNameDto) {

    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
    });

    if (!chat) {
      return null;
    }

    if (chat.rootUserId !== (req.user as any).sub) {
      return { error : 'You are not the root user' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        name: info.name,
      },
    });

    this.socket.emitRefreshValues();

    return { success: 'Name updated successfully' };
  }

  // invite a user to a private chat
  async invite(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return null;
    }
    
    const inviter = await this.prisma.user.findUnique({
      where: {
        id: (req.user as any).sub,
      },
    });

    if (!chat.admins.some(admin => admin.id === inviter.id)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        invited: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();
    const notification: NotificationI = {
      message: inviter.login + ' invited you to a private chat: ' + chat.name + '.',
      link: '/join-channel',
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User invited successfully' };
  }

  // uninvite a user from a private chat
  async uninvite(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        invited: {
          disconnect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();

    return { success: 'User uninvited successfully' };
  }

  // add user to admin list
  async addAdmin(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        admins: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();
    const notification: NotificationI = {
      message: 'You are now an admin in the chat ' + chat.name + '.',
      link: '/chat-info/' + chat.id,
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User is now admin' };
  }

  // remove user from admin list
  async removeAdmin(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        admins: {
          disconnect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();

    const notification: NotificationI = {
      message: 'You are no longer an admin in the chat ' + chat.name + '.',
      link: '/chat-info/' + chat.id,
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User is no longer admin' };
  }

  // kick user from chat
  async kick(req: Request, id: string, info: IdDto, notify: number) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        users: {
          disconnect: {
            id: user.id,
          },
        },
        admins: {
          disconnect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();

    if (notify === 1) {
      const notification: NotificationI = {
        message: 'You were kicked from the chat ' + chat.name + '.',
        link: '/chat',
      };
      this.socket.sendNotification(user.socketId, notification);
    }

    return { success: 'User kicked successfully' };
  }

  // ban user from chat
  async ban(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    this.kick(req, id, info, 0);

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        banned: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();

    const notification: NotificationI = {
      message: 'You were banned from the chat ' + chat.name + '.',
      link: '/chat',
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User banned successfully' };
  }

  // unban user from chat
  async unban(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    await this.prisma.chat.update({
      where: {
        id: +id,
      },
      data: {
        banned: {
          disconnect: {
            id: user.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues();
    const notification: NotificationI = {
      message: 'You were unbanned from the chat ' + chat.name + '.',
      link: '/join-channel/',
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User unbanned successfully' };
  }

  // mute user in chat for a limited time
  async mute(req: Request, id: string, info: MuteDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    // check if the user is already muted
    const mutedUser = await this.prisma.mutedUser.findFirst({
      where: {
        userId: user.id,
        chatId: +id,
      },
    });

    if (mutedUser) {
      return { error : 'User already muted' };
    }

    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + info.minutes);

    await this.prisma.mutedUser.create({
      data: {
        muteExpiration: expirationDate,
        userId: user.id,
        chatId: +id,
      },
    });

    this.socket.emitRefreshValues();
    const notification: NotificationI = {
      message: 'You were muted in the chat ' + chat.name + '.',
      link: '/chat/' + chat.id,
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User muted successfully' };
  }

  // unmute user in chat
  async unmute(req: Request, id: string, info: IdDto) {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        admins: true,
      },
    });
    if (!chat) {
      return { error : 'Chat not found' };
    }

    if (!chat.admins.some(admin => admin.id === (req.user as any).sub)) {
      return { error : 'You are not an admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: +info.userId,
      },
    });

    if (!user) {
      return { error : 'User not found' };
    }

    const mutedUser = await this.prisma.mutedUser.findFirst({
      where: {
        userId: user.id,
        chatId: +id,
      },
    });

    if (!mutedUser) {
      return { error : 'User not muted' };
    }

    await this.prisma.mutedUser.delete({
      where: {
        id: mutedUser.id,
      },
    });

    this.socket.emitRefreshValues();
    const notification: NotificationI = {
      message: 'You were unmuted in the chat ' + chat.name + '.',
      link: '/chat/' + chat.id,
    };
    this.socket.sendNotification(user.socketId, notification);

    return { success: 'User unmuted successfully' };
  }

  private async checkPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  private async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }
}