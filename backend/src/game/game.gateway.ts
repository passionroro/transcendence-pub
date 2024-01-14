import { UnauthorizedException } from '@nestjs/common';
import {
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { UserService } from 'src/user/user.service';
import { GameI, Ball, Paddle, GameInfo, NotificationI, ChatI, InviteI } from 'src/interfaces';

@WebSocketGateway({ cors: { origin: [process.env.FRONTEND_URL] } })
export class GameGateway implements OnGatewayDisconnect {

    @WebSocketServer()
    private server: Server;
    private queue: Map<Socket, string> = new Map;
    private gameStates: Map<string, GameInfo> = new Map;
    private interval = null;

    constructor(
        private gameService: GameService,
        private userService: UserService,
    ) {}

    async handleDisconnect(socket: Socket) {
        if (socket.data.user) {
            this.leaveActiveGame(socket);
        }
    }

    /* ----- */
    /* QUEUE */
    /* ----- */

    private getQueueSize(mode: string): number {
        let size = 0;
        this.queue.forEach((gameMode, socket) => { 
            if (gameMode === mode) { 
                size += 1;
            } 
        });
        return size;
    }

    @SubscribeMessage('joinQueue')
    async joinQueue(socket: Socket, mode: string) {
        if (this.queue.has(socket) || socket.data.user.id === undefined) {
            return ;
        }

        socket.join(mode);
        this.queue.set(socket, mode);
        await this.updateUserStatus(socket.data.user.id, `in queue (${mode})`);
        
        const size: number = this.getQueueSize(mode);
        this.server.to(mode).emit('usersInQueue', size);
        
        if (size >= 2) {
            this.pairPlayersFromQueue(socket, mode);
        }
    }

    @SubscribeMessage('leaveQueue')
    async leaveQueue(socket: Socket, mode: string) {
        if (this.queue.has(socket)) {
            this.queue.delete(socket);
            socket.leave(mode);
            this.server.to(mode).emit('usersInQueue', this.getQueueSize(mode));
            await this.updateUserStatus(socket.data.user.id, 'online');
        } else {
            socket.emit('Leave queue error', new UnauthorizedException());
        }
    }

    private async leaveRoom(gameId: string) {
        const clients = this.server.sockets.adapter.rooms.get(gameId);

        if (clients) {
            for (const clientId of clients) {
                const clientSocket = this.server.sockets.sockets.get(clientId);
                if (clientSocket) {
                    clientSocket.leave(gameId);
                    await this.updateUserStatus(clientSocket.data.user.id, 'online');
                }
            }
        }
    }

    @SubscribeMessage('leaveActiveGame')
    async leaveActiveGame(socket: Socket) {
        const gameId = await this.gameService.leaveActiveGame(socket.data.user);
        if (!gameId) {
            return ;
        }
  
        this.gameStates.delete(gameId); 
        this.server.to(gameId).emit('playerLeft', `${socket.data.user.login} left the game`);
        await this.leaveRoom(gameId);
    }

    private async pairPlayersFromQueue(player: Socket, mode: string) {
        let opponent: Socket | undefined;
        for (const [socket, gameMode] of this.queue.entries()) {
            if (mode === gameMode && socket !== player && !(await this.gameService.isBlocked(player, socket))) {
                opponent = socket;
                break;
            }
        }

        if (!opponent) { 
            return ;
        }

        //leave queue room and queue
        player.leave(mode);
        opponent.leave(mode);
        this.queue.delete(player);
        this.queue.delete(opponent);

        //database entry
        this.createNewGame(player, opponent, mode);
    }

    /* ---------------- */
    /* SERVER SIDE GAME */
    /* ---------------- */

    updateBallPosition(g: GameInfo) {
        const b: Ball = g.state.ball;
        const lp: Paddle = g.state.l_paddle;
        const rp: Paddle = g.state.r_paddle;
        const by = b.y + b.dy;
        const bx = b.x + b.dx;

        if (by < b.radius || by > g.height - b.radius) {
            b.dy = -b.dy;
        } else {
            if (bx - b.radius <= lp.x + lp.width) {
                if (by >= lp.y && by <= lp.y + lp.height) {
                    b.dx = -b.dx;
                } else {
                    g.winner = g.opponentLogin;
                    this.gameStates.delete(g.id);
                }
            }
            else if (bx + b.radius >= rp.x) {
                if (by >= rp.y && by <= rp.y + rp.height) {
                    b.dx = -b.dx;
                } else {
                    g.winner = g.playerLogin;
                    this.gameStates.delete(g.id);
                }
            }
        }

        b.x += b.dx;
        b.y += b.dy;
        
        this.server.to(g.id).emit('ballPosition', b);
    }

    endGameLoop(game: GameInfo) {
        this.server.to(game.id).emit('endMatch', game.winner);    
    }

    gameLoop(game: GameInfo) {
        const loop = () => {
            if (!this.gameStates.has(game.id)) {
                return this.endGameLoop(game);
            }
            this.updateBallPosition(game);
            setTimeout(loop, 16);
        };
        loop();
    }

    @SubscribeMessage('playerReady')
    async playerReady(socket: Socket, game: GameInfo) {
        const info = this.gameStates.get(game.id);
        if (info) {
            this.server.to(game.id).emit('playerReady', socket.data.user.login);
            setTimeout(() => {
                this.gameLoop(info);
            }, 2000);
        } else {
            this.gameStates.set(game.id, game);
        }
    }

    @SubscribeMessage('playerMoved')
    async playerMoved(socket: Socket, data: { gameId: string; position: number, login: string }) {
        const { gameId, position, login } = data;
        const info = this.gameStates.get(gameId);
        if (info) {
            const paddle = login === info.playerLogin ? info.state.l_paddle : info.state.r_paddle;
            paddle.y = position;
            this.server.to(gameId).emit('playerMoved', {position, login});
        }
    }

    @SubscribeMessage('updateScore')
    async updateScore(socket: Socket, data: { gameId: string; score: number, scored: string }) {
        const { gameId, score, scored } = data;
        if (scored === socket.data.user.login) {
            this.server.to(socket.id).emit('playerScore', score);
            socket.broadcast.to(gameId).emit('opponentScore', score); 
        } else {
            this.server.to(socket.id).emit('opponentScore', score);
            socket.broadcast.to(gameId).emit('playerScore', score);
        }
    }

    @SubscribeMessage('registerGame')
    async registerGame(socket: Socket, game: GameI) {
        this.gameService.registerGame(game, socket.data.user);
        this.server.to(game.id.toString()).emit('playerLeft', `${game.winner} won !`);
        await this.leaveRoom(game.id.toString());
    }

    @SubscribeMessage('deleteInvite')
    async deleteInvite(socket: Socket, data: { chat: ChatI, status: string }) {
        const { chat, status } = data;
        const user = await this.userService.findUserByLogin(chat.name);
        this.server.to(socket.id).to(user?.socketId).emit('updateInviteStatus', status);
        await this.gameService.deleteInvite(chat.id);
    }

    @SubscribeMessage('invite')
    async invite(player: Socket, data: { chat: ChatI, mode: string }) {
        const { chat, mode } = data;
        const invite: InviteI | undefined = await this.gameService.getInvite(chat.id);
        if (invite) {
            await this.deleteInvite(player, { chat, status: 'accepted' });
            await this.createNewGame(player, invite.socket, invite.mode);
        } else {
            const newInvite: InviteI = { socket: player, name: chat.name, mode: mode };
            await this.gameService.setInvite(chat.id, newInvite);
            this.sendInviteNotification(player, chat, mode, newInvite);
        }
    }

    private async sendInviteNotification(socket: Socket, chat: ChatI, mode: string, invite: InviteI) {
        const user = await this.userService.findUserByLogin(chat.name);
        if (!user) {
            return ;
        }
        const notification: NotificationI = {
            message: `${chat.name} wants to play ${mode} with you.`,
            link: '/chat/' + chat.id,
        };
        await this.sendNotification(user.socketId, notification);
        this.server.to(socket.id).to(user.socketId).emit('updateInviteStatus', invite.name);
    }

    private async createNewGame(player: Socket, opponent: Socket, mode: string) {
        const game: GameI = await this.gameService.createNewGame(
            player.data.user,
            opponent.data.user,
            mode,
        );

        const gameId = game.id.toString();
        player.join(gameId);
        opponent.join(gameId);
                
        await this.updateUserStatus(player.data.user.id, 'in game');
        await this.updateUserStatus(opponent.data.user.id, 'in game');
        
        this.server.to(gameId).emit('startMatch', game);
    }

    // UTILS 
    async updateUserStatus(userId: number, status: string) {
        await this.userService.updateUserStatus(userId, status);
        this.server.emit(`status:${userId}`, status);
    }

    async sendNotification(socket: string, notification: NotificationI) {
        this.server.to(socket).emit('notification', notification);
    }
    
}