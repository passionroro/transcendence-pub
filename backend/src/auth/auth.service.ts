import { Injectable, Req } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private userService: UserService,
    private jwtService: JwtService,
    private http: HttpService,
  ) {}

  async getAccessToken(@Req() req: Request) {
    const queryParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.get('42_CLIENT_ID'),
      client_secret: this.config.get('42_SECRET'),
      code: req.query.code as string,
      redirect_uri: process.env.CALLBACK_URL,
      state: this.config.get('42_STATE'),
    });
    const requestUrl =
      'https://api.intra.42.fr/oauth/token?' + queryParams.toString();
    const response = await firstValueFrom(this.http.post(requestUrl));
    const token = await response.data.access_token;
    return { token };
  }

  async signToken(@Req() req: Request) {
    let payload: any = {
      login: req.query.username as string,
      email: req.query.email as string,
    };
    let user = await this.userService.findUserByEmail(payload.email);
    if (!user) {
      user = await this.userService.createUser(payload);
    }
    payload.sub = user.id as string;
    const token = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
    });
    const login = user.login;
    const id = user.id as string;
    return { token, login, id };
  }

  async validate(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      const user = await this.userService.findUserByEmail(payload.email);
      if (!user) {
        return { ok: false, user: null };
      }
      return { ok: true, user };
    } catch (error) {
      return { ok: false, user: null };
    }
  }
}
