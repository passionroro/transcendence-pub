import { Injectable } from '@angular/core';
import { Observable, lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SocketService } from './socket.service';
import { DashboardI, GameI, Ball, GameInfo, ChatI } from '../interfaces';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PlayService {
  constructor(
    private socket: SocketService,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  /* SENDING EVENTS */

  // join classic mode queue
  joinQueue(mode: string) {
    this.socket.emit('joinQueue', mode);
  }

  leaveQueue(mode: string) {
    this.socket.emit('leaveQueue', mode);
  }

  // if the player is in a game, leave it (forfait)
  leaveActiveGame() {
    this.socket.emit('leaveActiveGame');
  }

  // sending the position of the paddle when it's moved
  async playerMoved(gameId: string, position: number, login: string) {
    this.socket.emit('playerMoved', { gameId, position, login });
  }

  // making sure the players are synchronized
  async playerReady(game: GameInfo) {
    this.socket.emit('playerReady', game);
  }

  // update score (client-side)
  updateScore(gameId: string, score: number, scored: string) {
    this.socket.emit('updateScore', { gameId, score, scored });
  }

  /* RECEIVING EVENTS */
  getUsersInQueue(): Observable<number> {
    return this.socket.fromEvent<number>('usersInQueue');
  }

  getStartMatch(): Observable<GameI> {
    return this.socket.fromEvent<GameI>('startMatch');
  }

  getPlayerLeft(): Observable<string> {
    return this.socket.fromEvent<string>('playerLeft');
  }

  getPlayerMoved(): Observable<any> {
    return this.socket.fromEvent<any>('playerMoved');
  }

  getPlayerReady(): Observable<string> {
    return this.socket.fromEvent<string>('playerReady');
  }

  getPlayerScore(): Observable<number> {
    return this.socket.fromEvent<number>('playerScore');
  }

  getOpponentScore(): Observable<number> {
    return this.socket.fromEvent<number>('opponentScore');
  }

  getBallPosition(): Observable<Ball> {
    return this.socket.fromEvent<Ball>('ballPosition');
  }

  getEndMatch(): Observable<string> {
    return this.socket.fromEvent<string>('endMatch');
  }
  
  /* DATABASE QUERIES */
  async initDashboard() {
    await lastValueFrom(
      this.http.get<DashboardI>(environment.BACK_URL + '/game/dashboard', {
        headers: this.auth.getHeader(),
      })
    );
  }

  async registerGame(game: GameI) {
    this.socket.emit('registerGame', game);
  }

  // INVITE
  async getInvite(chatId: number) {
    this.socket.emit('getInvite', chatId);
  }

  async inviteToGame(chat: ChatI, mode: string) {
    this.socket.emit('invite', { chat, mode });
  }

  async deleteInvite(chat: ChatI, status: string) {
    this.socket.emit('deleteInvite', { chat, status });
  }

  getInviteStatus(): Observable<string> {
    return this.socket.fromEvent<string>('updateInviteStatus');
  }

}