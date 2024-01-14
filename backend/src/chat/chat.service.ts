import { Injectable, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { Observable } from 'rxjs';
import { ChatI, MessageI, UserI, ActiveChatI } from 'src/interfaces';
import { Server, Socket } from "socket.io";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // return a list of all the user's chats ordered by update date
  async list(@Req() req: Request): Promise<ChatI[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        users: {
          some: {
            id: (req.user as any).sub,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        users: true,
        messages: true,
      },
    });

    if (!chats) {
      return [];
    }

    return chats.map((chat) => ({
      id: chat.id,
      name: chat.name,
      type: chat.type,
      users: chat.users,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  }

  // return an observable of all the user's chats oredered by last message date
  getChatListById(userId: number): Observable<ChatI[]> {
    return new Observable((observer) => {
      this.prisma.chat
        .findMany({
          where: {
            users: {
              some: {
                id: userId,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          include: {
            users: true,
            messages: true,
          },
        })
        .then((chats) => {
          if (!chats) {
            observer.next([]);
          } else {
            observer.next(
              chats.map((chat) => ({
                id: chat.id,
                creatorId: chat.creatorId,
                name: chat.name,
                type: chat.type,
                users: chat.users,
                messages: chat.messages,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
              })),
            );
          }
        });
    });
  }

  // return a chat by id
  async getChatById(id: number): Promise<ChatI> | null{
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: id,
      },
      include: {
        users: true,
        messages: true,
      },
    });

    if (!chat) {
      return null;
    }

    return {
      id: chat.id,
      name: chat.name,
      type: chat.type,
      users: chat.users,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  // create a new chat
  async createChat(creator: UserI, data: ChatI): Promise<ChatI> {
    const users = data.users.map((user) => ({ id: user.id }));

    const chat = await this.prisma.chat.create({
      data: {
        name: data.name,
        creatorId: creator.id,
        type: data.type,
        password: data.password,
        users: {
          connect: users,
        },
      },
      include: {
        users: true,
        messages: true,
      },
    });

    return {
      id: chat.id,
      name: chat.name,
      type: chat.type,
      users: chat.users,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  // create a new message
  async createMessage(newMessage: MessageI): Promise<MessageI> {
    const message = await this.prisma.message.create({
      data: {
        content: newMessage.content,
        chatId: newMessage.chat.id,
        userId: newMessage.user.id,
      },
    });

    return {
      id: message.id,
      content: message.content,
      chat: newMessage.chat,
      user: newMessage.user,
      createdAt: message.createdAt,
    };
  }

  // get active chats by chat id 
  async getActiveChats(chatId: number): Promise<ActiveChatI[]> {
    const chats = await this.prisma.activeChat.findMany({
      where: {
        chatId: chatId,
      },
    });

    return chats.map((chat) => ({
      id: chat.id,
      socketId: chat.socketId,
      chatId: chat.chatId,
      userId: chat.userId,
    }));
  }

  // join a chat as active chat
  async joinChat(socket: Socket, id: number): Promise<ActiveChatI> {
    //find the chat
    const chat = await this.getChatById(id);
    if (!chat) {
      console.warn('Chat id "' + id + '" not found');
      return null;
    }

    // check if the user is a member of the chat
    if (socket.data.user.id === undefined || !socket.data.user.id) {
      console.warn('User not found. Details: ' + JSON.stringify(socket.data.user));
      return null;
    }
    const user = chat.users.find((user) => user.id == socket.data.user.id);
    if (!user) {
      console.warn('User "' + socket.data.user.login + '" is not a member of the chat "' + chat.name + '"');
      return null;
    }

    // check if the user already has an active chat
    const activeChat = await this.prisma.activeChat.findFirst({
      where: {
        userId: socket.data.user.id,
      },
    });
    // if so, delete it
    if (activeChat) {
      await this.prisma.activeChat.deleteMany({
        where: {
          id: activeChat.id,
        },
      });
    }

    // create and return the new active chat
    return await this.prisma.activeChat.create({
      data: {
        socketId: socket.id,
        chatId: chat.id,
        userId: socket.data.user.id,
      },
    });
  }

  // return a list of all the chat's messages ordered by date excluding the user's blockedUsers
  async getMessages(chatId: number, receiverId: number): Promise<MessageI[]> {
    let filteredMessages: MessageI[] = [];
    const messages = await this.prisma.message.findMany({
      where: {
        chatId: chatId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: true,
      },
    });

    if (!messages) {
      return [];
    }
    
    // filter out messages from blocked users on group chats (direct chats are blocked in the frontend)
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: chatId,
      },
    });
    
    if (chat.type !== 'DIRECT') {
      for (const message of messages) {
        if (!await this.isBlocked(message.userId, receiverId)) {
          filteredMessages.push(message);
        }
      }
    } else {
      filteredMessages = messages;
    }
    
    return filteredMessages.map((message) => ({
      id: message.id,
      content: message.content,
      user: message.user,
      createdAt: message.createdAt,
    }));
  }

  // leave an active chat
  async leaveActiveChat(socketId: string) {
    try {
      const chatToDelete = await this.prisma.activeChat.findFirst({
        where: {
          socketId: socketId,
        },
      });

      if (chatToDelete) {
        await this.prisma.activeChat.delete({
          where: {
            id: chatToDelete.id,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  // update the chat's updatedAt field
  async updateChat(server: Server, chatId: number) {
    await this.prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    const chat = await this.prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        users: true,
      },
    });

    // update chat list for all users in the chat by sending them a new chat list to their user's socketId
    chat.users.forEach((user) => {
      this.getChatListById(user.id).subscribe((chats) => {
        server.to(user.socketId).emit('chats', chats);
      });
    });
  }

  // return true if the sender is on the blockedUsers list of the receiver
  async isBlocked(senderId: number, receiverId: number): Promise<boolean> {
    const receiver = await this.prisma.user.findUnique({
      where: {
        id: receiverId,
      },
      include: {
        blockedUsers: true,
      },
    });

    if (!receiver) {
      return false;
    }

    // check if the sender is on the blockedUsers list of the receiver
    const blockedUser = receiver.blockedUsers.find((user) => user.id === senderId);

    return !!blockedUser;
  }

  // return chat data by id
  async getData(id: string): Promise<ChatI> {
    if (id === 'undefined') {
      return null;
    }

    const chat = await this.prisma.chat.findUnique({
      where: {
        id: +id,
      },
      include: {
        users:    true,
        admins:   true,
        invited:  true,
        messages: true,
        rootUser: true,
        banned:   true,
        muted:    true,
      },
    });

    if (!chat) {
      return null;
    }

    return {
      id:         chat.id,
      name:       chat.name,
      type:       chat.type,
      users:      chat.users,
      admins:     chat.admins,
      invited:    chat.invited,
      rootUser:   chat.rootUser,
      messages:   chat.messages,
      createdAt:  chat.createdAt,
      updatedAt:  chat.updatedAt,
      creatorId:  chat.creatorId,
      banned:     chat.banned,
      muted:      chat.muted,
    };
  }

  // return a list of all friends that don't yet have a DIRECT chat type with the user
  async friendsWithoutChat(@Req() req: Request): Promise<UserI[]> {
    const friends = await this.prisma.user.findUnique({
      where: {
        id: (req.user as any).sub,
      },
      select: {
        friends: true,
      },
    });

    if (!friends) {
      return [];
    }

    const chats = await this.prisma.chat.findMany({
      where: {
        users: {
          some: {
            id: (req.user as any).sub,
          },
        },
      },
      include: {
        users: true,
      },
    });

    if (!chats) {
      return friends.friends;
    }

    const friendsWithoutChat = friends.friends.filter((friend) => {
      if (friend.id === (req.user as any).sub) {
        return false;
      }

      let hasChat = false;
      chats.forEach((chat) => {
        if (chat.type === 'DIRECT') {
          chat.users.forEach((user) => {
            if (user.id === friend.id) {
              hasChat = true;
            }
          });
        }
      });
      return !hasChat;
    });

    return friendsWithoutChat;
  }

  // return true if the sender is on the muted list of the chat
  async isMuted(message: MessageI): Promise<boolean> {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: message.chat.id,
      },
      include: {
        muted: true,
      },
    });

    if (!chat) {
      return false;
    }

    for (const mutedUser of chat.muted) {
      if (mutedUser.userId === message.user.id) {
        return true;
      }
    }

    return false;
  }
}
