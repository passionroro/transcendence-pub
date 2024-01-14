import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';

@Module({
    imports: [HttpModule],
    controllers: [GameController],
    providers: [GameService, UserService, GameGateway, AuthService],
    exports: [GameService],
  })
export class GameModule {}
