import { Controller, Req, Get, UseGuards, Param } from '@nestjs/common';
import { GameService } from './game.service';
import { GameI, DashboardI, UserRequestI, AchivementsI } from 'src/interfaces';
import { AuthGuard } from 'src/auth/guard';
import { Request } from 'express';

@Controller('game')
@UseGuards(AuthGuard)
export class GameController {
    constructor(private readonly gameService: GameService) {}
    
    @Get('history/:id')
    async getHistory(@Req() req: Request, @Param('id') id: string): Promise<GameI[]> {
        return await this.gameService.getHistory(parseInt(id));
    }

    @Get('dashboard')
    async getDashboard(@Req() req: Request): Promise<DashboardI> {
        const user = req.user as UserRequestI;
        let dashboard: DashboardI = await this.gameService.getDashboard(user.sub);
        if (!dashboard) {
            await this.gameService.createDashboard(user.sub);
            dashboard = await this.gameService.getDashboard(user.sub);
        }
        return dashboard;
    }

    @Get('achievements')
    async getAllAchievements(@Req() req: Request): Promise<AchivementsI[]> {
        return await this.gameService.getAllAchievements();
    }

    @Get('invite/:id')
    async getInvite(@Req() req: Request, @Param('id') id: string) {
        const response = await this.gameService.getInvite(parseInt(id));
        return { name: response?.name || null };
    }

}
