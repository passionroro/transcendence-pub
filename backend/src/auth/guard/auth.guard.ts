import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private config: ConfigService,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('Token not found');
        }
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.config.get('JWT_SECRET'),
            });
            const user = await this.findUserByEmail(payload.email);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }
            request['user'] = payload;
        } catch(error) {
            throw new UnauthorizedException(error);
        }
        return true;
    }

    async findUserByEmail(userEmail: string): Promise<any> | null {
        const user = await this.prisma.user.findUnique({
            where: {
                email: userEmail,
            },
        });
        return user;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
