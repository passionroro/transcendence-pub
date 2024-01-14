import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guard';
import { Request } from 'express';
import { TfaService } from './tfa/tfa.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private tfaService: TfaService,
    ) {}

    @Get('sign')
    async signToken(@Req() req: Request) {
        return this.authService.signToken(req);
    }

    @Get('token')
    async getAccessToken(@Req() req: Request) {
        return this.authService.getAccessToken(req);
    }

    @Get('validate')
    async validate(@Req() req: Request) {
        if (!req.headers.authorization) return { ok: false };
        return await this.authService.validate(req.headers.authorization.split(' ')[1]);
    }

    @Get('logout')
    @UseGuards(AuthGuard)
    async logout(@Req() req: Request) {
        await this.tfaService.unverifyTFA(req['user']);
    }
}
