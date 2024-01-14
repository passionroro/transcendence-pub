import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SocketIoConfig, Socket } from 'ngx-socket-io';

const config: SocketIoConfig = {
  url: environment.SOCKET, options: {
    transportOptions: {
      polling: {
        extraHeaders: {
          Authorization: localStorage.getItem('token') || ''
        }
      }
    }
  }
};

@Injectable({
  providedIn: 'root'
})
export class SocketService extends Socket {

  constructor() {
    super(config);
  }
}
