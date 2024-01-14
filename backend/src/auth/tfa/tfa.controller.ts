import { Controller, UseGuards, Body, Post, Get, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from '../guard';
import { TfaService } from './tfa.service';
import { CreateTfaDto } from './create-tfa.dto';

@Controller('tfa')
@UseGuards(AuthGuard)
export class TfaController {
    constructor(private readonly tfa: TfaService) {}

    @Post('enable')
    async enableTFA(@Req() req: Request) {
        return this.tfa.enableTFA(req['user']);
    }

    @Post('disable')
    async disableTFA(@Req() req: Request) {
        return this.tfa.disableTFA(req['user']);
    }

    @Get('status')
    async isEnabledTFA(@Req() req: Request, @Res() res: Response) {
        return this.tfa.isEnabledTFA(req['user'], res);
    }

    @Get('isVrified')
    async isVrifiedTFA(@Req() req: Request) {
        return this.tfa.isVrifiedTFA(req['user']);
    }

    @Get('generate')
    async generateTFA(@Req() req: Request, @Res() res: Response) {
        return this.tfa.generateTFA(res, req['user']);
    }

    @Post('verify')
    async verifyTFA(
        @Req() req: Request,
        @Body() dto: CreateTfaDto,
    ) {
        return this.tfa.verifyTFA(req['user'], dto.code);
    }
}
