import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { NotificationII } from '../interfaces';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

  constructor(private socket: SocketService) {
  }

  getNotification(): Observable<NotificationII> {
    return this.socket.fromEvent<NotificationII>('notification');
  }
}
