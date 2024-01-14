import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { UserI } from '../interfaces';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private router: Router,
    private socket: SocketService,
    private socketService: SocketService,
    ) { }

  async login() {
    const queryParams = new URLSearchParams({
      client_id: environment.CLIENT_ID,
      redirect_uri: environment.CALLBACK_URL,
      response_type: 'code',
      scope: 'public',
      state: environment.STATE_42,
    });

    const requestUrl =
      'https://api.intra.42.fr/oauth/authorize?' + queryParams.toString();
    window.location.href = requestUrl;
  }

  async hasValidToken(): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    try {
      const response: any = await lastValueFrom(
        this.http.get(environment.BACK_URL + '/auth/validate', { headers })
      );
      return response.ok === true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async logout() {
    this.socket.disconnect();
    await lastValueFrom(this.http.get(environment.BACK_URL + '/auth/logout', { headers: this.getHeader() }));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('id');
    this.router.navigate(['/login']);
  }

  async ifTFAEnabled(): Promise<boolean> {
    try {
      const response: any = await lastValueFrom(
        this.http.get<boolean>(`${environment.BACK_URL}/tfa/status`, {
          headers: this.getHeader(),
        })
      );
      return response.enabled === true;
    } catch (error) {
      return false;
    }
  }

  async enableTFA() {
    return await lastValueFrom(
      this.http.post(
        `${environment.BACK_URL}/tfa/enable`,
        {},
        { headers: this.getHeader() }
      )
    );
  }

  async disableTFA() {
    return await lastValueFrom(
      this.http.post(
        `${environment.BACK_URL}/tfa/disable`,
        {},
        { headers: this.getHeader() }
      )
    );
  }

  async generateQRCode() {
    return await lastValueFrom(
      this.http.get(`${environment.BACK_URL}/tfa/generate`, {
        headers: this.getHeader(),
      })
    );
  }

  async verifyTFA(code: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    };

    const params = new HttpParams().set('code', code);

    return await lastValueFrom(
      this.http.post(
        `${environment.BACK_URL}/tfa/verify`,
        params.toString(),
        httpOptions
      )
    );
  }

  async isVerifiedTFA(): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      return true;
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    try {
      const response: any = await lastValueFrom(
        this.http.get<boolean>(`${environment.BACK_URL}/tfa/isVrified`, {
          headers,
        })
      );
      return response.ok === true;
    } catch {
      return false;
    }
  }

  async ifUserExists(): Promise<boolean> {
    try {
      const res = await lastValueFrom(
        this.http.get<boolean>(
          `${environment.BACK_URL}/user/${localStorage.getItem('user')}`
        )
      );
      return res === true;
    } catch {
      return false;
    }
  }

  getHeader() {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    });
  }

  async getUser(id: string): Promise<UserI> {
    return await lastValueFrom(
      this.http.get<UserI>(`${environment.BACK_URL}/user/user/${id}`, {
        headers: this.getHeader(),
      })
    );
  }

  getRefreshValues(): Observable<string> {
    return this.socketService.fromEvent<string>(`refresh-values`);
  }
}
