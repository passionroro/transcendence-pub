import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatI, MessageI } from '../interfaces';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(
    private socket: SocketService,
    private http: HttpClient,
    private authService: AuthService,
  ) { }
  
  getChatsByHttp(): Observable<ChatI[]> {
    return this.http.get<ChatI[]>(environment.BACK_URL + '/chat/list', { headers: this.authService.getHeader() });
  }

  getMessagesByHttp(chatId: number): Observable<MessageI[]> {
    return this.http.get<MessageI[]>(environment.BACK_URL + '/chat/' + chatId + '/messages', { headers: this.authService.getHeader() });
  }

  async sendMessage(message: string, chat: ChatI) {
    const newMessage: MessageI = {
      content: message,
      chat: chat,
    };
    this.socket.emit('sendMessage', newMessage);
  }

  getNewMessage(): Observable<MessageI> {
    return this.socket.fromEvent<MessageI>('newMessage');
  }

  createChat(chat: ChatI): void {
    this.socket.emit('createChat', chat);
  }

  joinChat(chatId: number): void {
    this.socket.emit('joinChat', chatId);
  }

  leaveActiveChat(): void {
    this.socket.emit('leaveActiveChat');
  }

  getChatMessages(): Observable<MessageI[]> {
    return this.socket.fromEvent<MessageI[]>('messages');
  }

  getChatsByWs(): Observable<ChatI[]> {
    return this.socket.fromEvent<ChatI[]>('chats');
  }
}
