import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { TfaModule } from './tfa/tfa.module';
import { TfaService } from './tfa/tfa.service';

@Module({
  imports: [HttpModule, UserModule, JwtModule.register({
    global: true,
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: '100m' },
  }), TfaModule],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtService, TfaService]
})
export class AuthModule {}
