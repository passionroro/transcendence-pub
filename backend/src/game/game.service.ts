import { Injectable  } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Socket } from 'socket.io';
import Decimal from 'decimal.js';
import { DashboardI, GameI, UserI, AchivementsI, InviteI } from 'src/interfaces';

@Injectable()
export class GameService {
    private achievements: AchivementsI[] = [];
    constructor(private prisma: PrismaService) {
        this.achievements = [
            {
              name: 'First Game',
              description: 'Hello there 👋',
            },
            {
              name: 'First Win',
              description: 'Can you do it again?',
            },
            {
              name: 'Win 10 games',
              description: 'MLG pro gamer move 👓',
            },
            {
              name: 'Win 100 games',
              description: 'touch grass wtf',
            },
            {
              name: 'Win against a dev',
              description: "You're gonna get banned soon",
            },
          ];
    }

    /* GETTERS */
    async getHistory(userSub: number): Promise<GameI[]> {
        return await this.prisma.game.findMany({
            where: {
                OR: [
                    {
                        player1Id: userSub,
                    },
                    {
                        player2Id: userSub,
                    },
                ],
            },
        });
    }

    async getDashboard(userSub: number): Promise<DashboardI> {
        const dashboard = await this.prisma.dashboard.findMany({
            where: {
                userId: userSub,
            },
            include: {
                matchHistory: true,
            },
        });
        return dashboard[0];
    }

    async getAllAchievements(): Promise<AchivementsI[]> {
        return this.achievements;
    }

    private async getCurrentGame(user: UserI) {
        const game = await this.prisma.game.findFirst({
            where: {
                OR: [
                    {
                        player1Id: user.id,
                    },
                    {
                        player2Id: user.id,
                    },
                ],
                winner: null,
            },
        });
        return game;
    }

    /* INVITES */
    private invites: Map<number, InviteI> = new Map;
    async getInvite(chatId: number): Promise<InviteI | undefined> {
        return this.invites.get(chatId);
    }

    async setInvite(chatId: number, invite: InviteI) {
        return this.invites.set(chatId, invite);
    }

    async deleteInvite(chatId: number) {
        return this.invites.delete(chatId);
    }

    /* SETTERS */
    async createDashboard(userSub: number) {
        await this.prisma.dashboard.create({
            data: {
                id: userSub,
                userId: userSub,
                totalGames: 0,
                totalWins: 0,
                totalLoses: 0,
                level: new Prisma.Decimal(0),
                achievements: [] as string[],
                matchHistory: {
                    create: [],
                },
            },
        });
    }

    async createNewGame(player1: any, player2: any, mode: string) {
        return await this.prisma.game.create({
            data: {
                player1Id: player1.id,
                player2Id: player2.id,
                player1Login: player1.login,
                player2Login: player2.login,
                score: '0-0',
                mode: mode,
            },
        });
    }

    /* PAIRING */
    async isBlocked(player: Socket, opponent: Socket): Promise<boolean> {
        const blockedUsers = await this.prisma.user.findMany({
            where: {
                id: player.data.user.id,
            },
            include: {
                blockedUsers: true,
            },
        });
        for (const blockedUser of blockedUsers[0].blockedUsers) {
            if (blockedUser.id === opponent.data.user.id) {
                return true;
            }
        }
        return false;
    }

    /* LEAVE GAME */
    async leaveActiveGame(user: UserI) {
        const game = await this.getCurrentGame(user);
        if (game === null) {
            return;
        }
        const winner = game.player1Login === user.login ? game.player2Login : game.player1Login;
        await this.updateGameResult(game, winner);
        await this.updateDashboard(
            game.player1Id,
            game,
        );
        await this.updateDashboard(
            game.player2Id,
            game,
        );
        return game.id.toString();
    }

    private async updateGameResult(game: GameI, winner?: string) {
        if (winner) {
            game.winner = winner;
        }
        await this.prisma.game.update({
            where: {
                id: game.id,
            },
            data: {
                winner: winner ? winner : game.winner,
                score: game.score === '0-0' ? 'FF' : game.score,
            },
        });
    }

    /* ACHIEVMENTS */
    async updateDashboardAchievements(dashboard: DashboardI, opponentLogin: string, gameResult: string) {
        const achievements: string[] = dashboard.achievements;
        if (dashboard.totalGames === 1) {
            achievements.push(this.achievements[0].name);
        }
        if (dashboard.totalWins === 1) {
            achievements.push(this.achievements[1].name);
        }
        if (dashboard.totalWins === 10) {
            achievements.push(this.achievements[2].name);
        }
        if (dashboard.totalWins === 100) {
            achievements.push(this.achievements[3].name);
        }
        const dev = ["lgaillar", "henkaoua", "rohoarau", "jhermon-", "vnicoud"];
        if (gameResult === 'win' && !achievements.includes(this.achievements[4].name)) {
            for (const player of dev) {
                if (opponentLogin === player) {
                    achievements.push(this.achievements[4].name);
                }
            }
        }
        await this.prisma.dashboard.update({
            where: {
                id: dashboard.id,
            },
            data: {
                achievements: achievements,
            },
        });
    }

    /* UPDATE */
    async updateDashboard(playerId: number, game: GameI) {
        let dashboard = await this.prisma.dashboard.findFirst({
            where: {
                userId: playerId,
            },
        });
        const playerLogin = playerId === game.player1Id ? game.player1Login : game.player2Login;
        const opponentLogin = playerId === game.player1Id ? game.player2Login : game.player1Login;
        const gameResult = game.winner === playerLogin ? 'win' : 'lose';
        if (gameResult === 'win') {
            dashboard = await this.updateDashboardWin(dashboard);
        } else {
            dashboard = await this.updateDashboardLose(dashboard);
        }
        await this.updateDashboardAchievements(dashboard, opponentLogin, gameResult);

    }

    async updateDashboardWin(dashboard: DashboardI) {
        const calculateNewLevel = (totalWins: number, currentLevel: Decimal): Decimal => {
          const baseExperience = 0.3;
          const newExperience = totalWins * baseExperience;
          return new Decimal(Math.sqrt(newExperience));
        };
      
        const newLevel: Decimal = calculateNewLevel(dashboard.totalWins + 1, dashboard.level);
      
        return await this.prisma.dashboard.update({
          where: {
            id: dashboard.id,
          },
          data: {
            totalGames: dashboard.totalGames + 1,
            totalWins: dashboard.totalWins + 1,
            level: newLevel.toFixed(2),
          },
        });
      }

    async updateDashboardLose(dashboard: DashboardI) {
        return await this.prisma.dashboard.update({
            where: {
                id: dashboard.id,
            },
            data: {
                totalGames: dashboard.totalGames + 1,
                totalLoses: dashboard.totalLoses + 1,
            },
        });
    }

    async registerGame(game: GameI, user: UserI) {
        if (await this.getCurrentGame(user) === null) {
            return ;
        }
        await this.updateGameResult(game);
        await this.updateDashboard(game.player1Id, game);
        await this.updateDashboard(game.player2Id, game);
    }

    // INVITE

}
