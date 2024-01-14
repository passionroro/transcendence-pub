import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { HttpModule } from '@nestjs/axios';
import { UserController } from './user.controller';

@Module({
  imports: [HttpModule],
  providers: [UserService, HttpModule],
  controllers: [UserController]
})
export class UserModule {}