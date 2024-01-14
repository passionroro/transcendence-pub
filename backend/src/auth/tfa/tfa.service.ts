import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { authenticator } from 'otplib';
import { Response } from 'express';

const QRCode = require('qrcode');

@Injectable()
export class TfaService {
    constructor(
        private readonly userService: UserService,
        private readonly prisma: PrismaService,
    ) {}

    async updateUserTfa(userId: number, secret: string, enabled: boolean, verified: boolean) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                tfaSecret: secret,
                tfaEnabled: enabled,
                tfaVerified: verified,
            },
        });
    }

    async enableTFA(userInfo) {
        const user = await this.userService.findUserByEmail(userInfo.email);
        if (user.tfaEnabled == true) {
            return { err: 'Two-factor authentication is already enabled' };
        }
        await this.updateUserTfa(user.id, user.tfaSecret, true, true);
        return { msg: 'Two-factor authentication enabled successfully' };
    }

    async isEnabledTFA(userInfo, res: Response) {
        const user = await this.userService.findUserByEmail(userInfo.email);
        return res.status(200).json({ enabled: user.tfaEnabled });
    }

    async isVrifiedTFA(userInfo)  {
        const user = await this.userService.findUserByEmail(userInfo.email);
        if (user.tfaEnabled == true && user.tfaVerified == false) {
            return { ok: false };
        }
        return { ok: true };
    }

    async unverifyTFA(userInfo) {
        const user = await this.userService.findUserByEmail(userInfo.email);
        await this.updateUserTfa(user.id, user.tfaSecret, user.tfaEnabled, false);
    }

    async disableTFA(userInfo) {
        const user = await this.userService.findUserByEmail(userInfo.email);
        await this.updateUserTfa(user.id, '', false, false);    
        return { msg: 'Two-factor authentication disabled successfully' };
    }

    async generateTFA(res: Response, userInfo) {
        const user = await this.userService.findUserByEmail(userInfo.email);
        let secret = user.tfaSecret;
        if (secret && user.tfaEnabled) {
            return { err: 'Two-factor authentication is already enabled' };
        }
        secret = authenticator.generateSecret();
        await this.updateUserTfa(user.id, secret, false, false);
        const otpauthUrl = authenticator.keyuri(
            user.email,
            'Transcendence 2FA',
            secret,
        );
        try {
            const qrCodeURL = await QRCode.toDataURL(otpauthUrl);
            return res.status(200).json({ qrCode: qrCodeURL });
        } catch (error) {
            console.error(error);
            await this.updateUserTfa(user.id, '', false, false);
            return res.status(500).json({ err: 'Error generating QR code' });
        }
    }

    async verifyTFA(userInfo, token: string) {
        const user = await this.userService.findUserByEmail(userInfo.email);
        const secret = user.tfaSecret;
        const ok = authenticator.verify({ token, secret });
        if (!ok) {
            return { err: 'Incorrect code' };
        }
        await this.updateUserTfa(user.id, user.tfaSecret, user.tfaEnabled, true);
        return { ok: true };
    }
}
