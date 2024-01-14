import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: [process.env.FRONTEND_URL] } })
export class AvatarGateway {

  constructor() { }

  @WebSocketServer() server: Server;

  emitRefreshValues() {
    this.server.emit('refresh-values');
  }
}