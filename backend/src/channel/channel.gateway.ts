import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { NotificationI } from 'src/interfaces';

@WebSocketGateway({ cors: { origin: [process.env.FRONTEND_URL] } })
export class ChannelGateway {

  constructor() { }

  @WebSocketServer()
  server: Server;

  emitRefreshValues() {
    this.server.emit('refresh-values');
  }

  sendNotification(socket: string, notification: NotificationI) {
    this.server.to(socket).emit('notification', notification);
  }
}