import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChatI, NotificationI } from 'src/interfaces';

@WebSocketGateway({ cors: { origin: [process.env.FRONTEND_URL] } })
export class FriendsGateway {

  constructor() { }

  @WebSocketServer()
  server: Server;

  emitRefreshValues(socketId: string) {
    this.server.to(socketId).emit('refresh-values');
  }
  
  emitRefreshAll() {
    this.server.emit('refresh-values');
  }

  sendNotification(socket: string, notification: NotificationI) {
    this.server.to(socket).emit('notification', notification);
  }
}