import { Module } from '@nestjs/common';
import { TfaService } from './tfa.service';
import { TfaController } from './tfa.controller';
import { UserService } from '../../user/user.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [TfaService, UserService],
  controllers: [TfaController]
})
export class TfaModule {}