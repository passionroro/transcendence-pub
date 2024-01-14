import { Injectable, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserI } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { FriendDto } from './friends.dto';
import { FriendsGateway } from './friends.gateway';

@Injectable()
export class FriendsService {

  constructor(
    private prisma: PrismaService,
    private socket: FriendsGateway,
  ) {}

  async getFriendSocketId(id: number) {
    const friend = await this.prisma.user.findUnique({
      where: { id: id },
      select: { socketId: true },
    });
    return friend.socketId;
  }

  async addFriend(@Req() req: Request, body: FriendDto) {
    // add a friend request to the friend's friendRequests array
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: { friendRequests: true },
    });

    // check if the friendId is in the user's friendsRequests array
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friendRequests: true },
    });
    const isRequestReceived = user.friendRequests.some(friendRequests => friendRequests.id === friendId);
    if (isRequestReceived) {
      return { status: 'error', message: 'You have already received a friend request from this user.' };
    }

    // Check if the userId is in the friend's friendRequests array
    const isRequestSent = friend.friendRequests.some(friendRequests => friendRequests.id === userId);
    if (isRequestSent) {
      return { status: 'error', message: 'You have already sent a friend request to this user.' };
    }

    await this.prisma.user.update({
      where: { id: friendId },
      data: {
        friendRequests: {
          connect: {
            id: userId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
      const notification = {
        message: `${user.login} sent you a friend request.`,
        link: '/profile/' + userId,
      };
      this.socket.sendNotification(friendSocketId, notification);
    }

    return { status: 'success', message: `Friend request was sent to ${friend.login}.` };
  }

  async cancelRequest(@Req() req: Request, body: FriendDto) {
    // remove a friend request from the friend's friendRequests array
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: { friendRequests: true },
    });

    // Check if the userId is in the friend's friendRequests array
    const isRequestSent = friend.friendRequests.some(friendRequests => friendRequests.id === userId);
    if (!isRequestSent) {
      return { status: 'error', message: 'You have not sent a friend request to this user.' };
    }

    await this.prisma.user.update({
      where: { id: friendId },
      data: {
        friendRequests: {
          disconnect: {
            id: userId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
    }

    return { status: 'success', message: `Friend request was cancelled.` };
  }

  async acceptRequest(@Req() req: Request, body: FriendDto) {
    // add a friend to the user's friends array
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friendRequests: true },
    });

    // Check if the friendId is in the user's friendRequests array
    const isRequestReceived = user.friendRequests.some(friendRequests => friendRequests.id === friendId);
    if (!isRequestReceived) {
      return { status: 'error', message: 'You have not received a friend request from this user.' };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        friends: {
          connect: {
            id: friendId,
          },
        },
        friendRequests: {
          disconnect: {
            id: friendId,
          },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: friendId },
      data: {
        friends: {
          connect: {
            id: userId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
      const notification = {
        message: `${user.login} accepted your friend request.`,
        link: '/profile/' + userId,
      };
      this.socket.sendNotification(friendSocketId, notification);
    }

    return { status: 'success', message: `Friend request was accepted.` };
  }

  async declineRequest(@Req() req: Request, body: FriendDto) {
    // remove a friend request from the user's friendRequests array
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friendRequests: true },
    });

    // Check if the friendId is in the user's friendRequests array
    const isRequestReceived = user.friendRequests.some(friendRequests => friendRequests.id === friendId);
    if (!isRequestReceived) {
      return { status: 'error', message: 'You have not received a friend request from this user.' };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        friendRequests: {
          disconnect: {
            id: friendId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
      const notification = {
        message: `${user.login} declined your friend request.`,
        link: '/profile/' + userId,
      };
      this.socket.sendNotification(friendSocketId, notification);
    }

    return { status: 'success', message: `Friend request was declined.` };
  }

  async block(@Req() req: Request, body: FriendDto) {
    // add a friend to the user's blocked array and remove him from the friends array if he is there
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friendRequests: true, blockedUsers: true, friends: true },
    });

    // Check if the friendId is in the user's blocked array
    const isBlocked = user.blockedUsers.some(blocked => blocked.id === friendId);
    if (isBlocked) {
      return { status: 'error', message: 'This user is already blocked.' };
    }

    await this.unfriend(req, friendId.toString(), 0);
    await this.cancelRequest(req, body);
    await this.declineRequest(req, body);

    // add the friend to the user's blocked array
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedUsers: {
          connect: {
            id: friendId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
      const notification = {
        message: `${user.login} blocked you.`,
        link: '/profile/' + userId,
      };
      this.socket.sendNotification(friendSocketId, notification);
    }

    return { status: 'success', message: `User was blocked.` };
  }

  async unblock(@Req() req: Request, body: FriendDto) {
    // remove a friend from the user's blocked array
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { blockedUsers: true },
    });

    // Check if the friendId is in the user's blocked array
    const isBlocked = user.blockedUsers.some(blocked => blocked.id === friendId);
    if (!isBlocked) {
      return { status: 'error', message: 'This user is not blocked.' };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedUsers: {
          disconnect: {
            id: friendId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
      const notification = {
        message: `${user.login} unblocked you.`,
        link: '/profile/' + userId,
      };
      this.socket.sendNotification(friendSocketId, notification);
    }

    return { status: 'success', message: `User was unblocked.` };
  }

  async findAllFriends(@Req() req: Request): Promise<UserI[]> {
    // returns the user's friends array ordered by login
    return await this.prisma.user.findUnique({
      where: { id: (req.user as any).sub },
      include: { friends: { orderBy: { login: 'asc' } } },
    }).then(user => user.friends);
  }

  async findAllUsers(@Req() req: Request): Promise<UserI[]> {
    // returns all users except the user himself
    return await this.prisma.user.findMany({
      where: { id: { not: (req.user as any).sub } },
    });
  }

  async userData(id: string) {
    //returns the friend's user.gameDashboard data based on the ID
    return await this.prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { gameDashboard: true },
    });
  }

  async isFriend(@Req() req: Request, id: string) {
    // returns true if the friend's ID is in the user's friends array
    const userId = (req.user as any).sub;
    const friendId = parseInt(id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friends: true },
    });
    return user.friends.some(friend => friend.id === friendId);
  }

  async isRequestSent(@Req() req: Request, id: string) {
    // returns true if the user's ID is in the friend's friendRequests array
    const userId = (req.user as any).sub;
    const friendId = parseInt(id);

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: { friendRequests: true },
    });
    return friend.friendRequests.some(friendRequests => friendRequests.id === userId);
  }

  async isRequestReceived(@Req() req: Request, id: string) {
    // returns true if the friend's ID is in the user's friendRequests array
    const userId = (req.user as any).sub;
    const friendId = parseInt(id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friendRequests: true },
    });
    return user.friendRequests.some(friendRequests => friendRequests.id === friendId);
  }

  async unfriend(@Req() req: Request, id: string, notify: number) {
    // remove a friend from the user's friends array and vice versa
    const userId = (req.user as any).sub;
    const friendId = parseInt(id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { friends: true },
    });

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: { friends: true },
    });

    // Check if the friendId is in the user's friends array
    const isFriend = user.friends.some(friend => friend.id === friendId);
    if (!isFriend) {
      return { status: 'error', message: `${friend.login} isn't your friend` }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        friends: {
          disconnect: {
            id: friendId,
          },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: friendId },
      data: {
        friends: {
          disconnect: {
            id: userId,
          },
        },
      },
    });

    const friendSocketId = await this.getFriendSocketId(friendId);
    if (friendSocketId) {
      this.socket.emitRefreshValues(friendSocketId);
      if (notify) {
        const notification = {
          message: `${user.login} removed you from his friends list.`,
          link: '/profile/' + userId,
        };
        this.socket.sendNotification(friendSocketId, notification);
      }
    }

    return { status: 'success', message: `${friend.login} was removed from your friends list` }
  }

  async isBlocked(@Req() req: Request, id: string) {
    // returns true if the user's ID is in the friend's blocked array
    const userId = (req.user as any).sub;
    const friendId = parseInt(id);
  
    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: { blockedUsers: true },
    });

    return friend.blockedUsers.some(blocked => blocked.id === userId);
  }

  async isBlocking(@Req() req: Request, id: string) {
    // returns true if the friend's ID is in the user's blocked array
    const userId = (req.user as any).sub;
    const friendId = parseInt(id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { blockedUsers: true },
    });

    return user.blockedUsers.some(blocked => blocked.id === friendId);
  }

  async findChat(@Req() req: Request, body: FriendDto) {
    // returns the chat ID if the chat exists, otherwise creates a new chat and returns its ID
    const userId = (req.user as any).sub;
    const friendId = body.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { chats: { include: { users: true } } },
    });

    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      include: { chats: { include: { users: true } } },
    });

    // Check if a DIRECT chat exists between the user and the friend
    const chat = user.chats.find(chat => chat.type === 'DIRECT' && chat.users.some(user => user.id === friendId));
    if (chat) {
      return chat.id;
    }

    // Create a new chat
    const newChat = await this.prisma.chat.create({
      data: {
        type: 'DIRECT',
        creatorId: userId,
        name: `${user.login} - ${friend.login}`,
        users: {
          connect: [
            { id: userId },
            { id: friendId },
          ],
        },
      },
    });

    // Add the new chat to the user's chats array
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        chats: {
          connect: {
            id: newChat.id,
          },
        },
      },
    });

    // Add the new chat to the friend's chats array
    await this.prisma.user.update({
      where: { id: friendId },
      data: {
        chats: {
          connect: {
            id: newChat.id,
          },
        },
      },
    });

    this.socket.emitRefreshValues(friend.socketId);

    return newChat.id;
  }

  async changeUsername(@Req() req, username: string) {

    const user = await this.prisma.user.findUnique({
        where: {
          login: username,
        },
    });

    if (!user) {
      await this.prisma.user.update({
        where: {
          id: req.user.sub,
        },
        data: {
          login: username,
        },
      });

      this.socket.emitRefreshAll();

      return { msg: 'Username changed successfully' };
    } else {
      return { err: 'Username already taken' };
    }
  }
}
