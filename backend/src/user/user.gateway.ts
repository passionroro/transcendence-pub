import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: [process.env.FRONTEND_URL] } })
export class UserGateway {

  constructor() { }

  @WebSocketServer() server: Server;
}