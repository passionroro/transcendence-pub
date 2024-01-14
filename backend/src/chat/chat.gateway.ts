import { UnauthorizedException } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { of } from "rxjs";
import { Server, Socket } from "socket.io";
import { AuthService } from "src/auth/auth.service";
import { ChatService } from "./chat.service";
import { ChatI, MessageI, NotificationII } from "src/interfaces";
import { UserService } from "src/user/user.service";

@WebSocketGateway({ cors: { origin: [process.env.FRONTEND_URL] } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private userService: UserService,
    ) { }

  @WebSocketServer()
  server: Server;

  // check if the user is authenticated
  async handleConnection(socket: Socket) {
    try {
      const { ok, user } = await this.authService.validate(socket.handshake.headers.authorization);
      if (ok != true || !user) {
        return this.disconnect(socket);
      } else {
        socket.data.user = user;
        await this.userService.updateUserSocketId(user.id, socket.id);
        await this.updateUserStatus(socket, 'online');
        await this.getUsersOnSite();
        this.getChats(socket.id, user.id);
      }
    } catch (error) {
      return this.disconnect(socket);
    }
  }

  async handleDisconnect(socket: Socket) {
    if (socket.data.user) {
      await this.userService.updateUserSocketId(socket.data.user.id, null);
      await this.updateUserStatus(socket, 'offline');
    }
    await this.chatService.leaveActiveChat(socket.id);
  }

  // send the chats to client through socket
  getChats(socketId: string, userId: number) {
    return this.chatService.getChatListById(userId)
      .subscribe((chats) => {
      this.server.to(socketId).emit('chats', chats);
    });
  }

  private disconnect(socket: Socket) {
    socket.emit('Error', new UnauthorizedException());
    socket.disconnect();
  }

  @SubscribeMessage('createChat')
  async createChat(socket: Socket, chat: ChatI) {
    await this.chatService.createChat(socket.data.user, chat);
    this.getChats(socket.id, socket.data.user.id);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(socket: Socket, newMessage: MessageI) {
    if (!newMessage.chat) return of(null);

    const user = await this.userService.getUserById(socket.data.user.id.toString());
    newMessage.user = user;

    // check if the sender is not muted on this chat
    if (await this.chatService.isMuted(newMessage)) { return }

    if (newMessage.chat.id) {
      // create a new message record
      const message = await this.chatService.createMessage(newMessage);

      // send the message to all active chats
      const activeChats = await this.chatService.getActiveChats(newMessage.chat.id);
      activeChats.forEach(async (chat) => {
        // check if the sender is not on the blockedUsers list of the receiver
        if (!(await this.chatService.isBlocked(user.id, chat.userId))) {
          this.server.to(chat.socketId).emit('newMessage', message);
        }
      });

      const chat = await this.chatService.getChatById(newMessage.chat.id);
      chat.users.forEach(async (chatUser) => {
        if (chatUser.id != user.id && !(await this.chatService.isBlocked(user.id, chatUser.id))) {
          await this.sendChatNotification(chatUser.id, newMessage);
        }
      });

      // update the chat's updatedAt field
      await this.chatService.updateChat(this.server, newMessage.chat.id);
    }
  }

  // send notification to receiver when a new message is sent
  async sendChatNotification(receiverId: number, message: MessageI) {
    const receiver = await this.userService.getUserById(receiverId.toString());

    // check if the sender is on muted list of the chat
    if (await this.chatService.isMuted(message)) { return }

    var msg = message.content;
    if (msg.length > 20) {
      msg = message.content.substring(0, 20) + '...';
    }
    const notification: NotificationII = {
      message: msg,
      name: message.user.login,
      link: '/chat/' + message.chat.id,
      type: 'chat',
    };

    if (receiver.socketId) {
      this.server.to(receiver.socketId).emit('notification', notification );
    }
  }

  @SubscribeMessage('joinChat')
  async joinChat(socket: Socket, chatId: number) {
    const activeChat = await this.chatService.joinChat(socket, chatId);

    if (!activeChat) {
      return of(null);
    }

    const messages = await this.chatService.getMessages(chatId, socket.data.user.id);
    this.server.to(socket.id).emit('messages', messages);
  }

  @SubscribeMessage('leaveActiveChat')
  async leaveActiveChat(socket: Socket) {
    this.chatService.leaveActiveChat(socket.id);
  }

  @SubscribeMessage('updateUserStatus')
  async updateUserStatus(socket: Socket, status: string) {
    await this.userService.updateUserStatus(socket.data.user.id, status);
    await this.emitStatus(socket.data.user.id);
  }

  async emitStatus(userId: number) {
    const status = await this.userService.getUserStatus(userId)
    this.server.emit(`status:${userId}`, status);
  }

  @SubscribeMessage('getStatus')
  async getStatus(socket: Socket, userId: number) {
    await this.emitStatus(userId);
  }

  async getUsersOnSite() {
    const users = await this.userService.getAllUsers();
    this.server.emit('users-on-site', users);
  }
}