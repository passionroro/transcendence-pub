import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserI } from '../interfaces';
import { SocketService } from 'src/app/service/socket.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private socket: SocketService,
  ) { }
  
  getUsersOnSite(): Observable<UserI[]> {
    return this.socket.fromEvent<UserI[]>('users-on-site');
  }

  async connectSocket() {
    await this.socket.connect();
  }

  async disconnectSocket() {
    await this.socket.disconnect();
  }
}
