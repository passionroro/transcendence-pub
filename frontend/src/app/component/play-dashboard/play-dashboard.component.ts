import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { DashboardI, AchivementsI } from 'src/app/interfaces/';
import { AuthService } from 'src/app/service/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { lastValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-play-dashboard',
  templateUrl: './play-dashboard.component.html',
  styleUrls: ['./play-dashboard.component.css']
})
export class PlayDashboardComponent implements OnInit {
  @ViewChild('achievementsDialog') achievementsDialog!: TemplateRef<any>;
  dashboard: DashboardI | null = null;
  winRate: number = 0;
  playerAchievements: string[] = [];
  allAchievements: AchivementsI[] = [];

  constructor(private auth: AuthService, private http: HttpClient, private dialog: MatDialog) {}

  async ngOnInit(): Promise<void> {
    this.allAchievements = await lastValueFrom(
      this.http.get<AchivementsI[]>(environment.BACK_URL + '/game/achievements', {
        headers: this.auth.getHeader(),
      })
    );
    this.dashboard = await lastValueFrom(
      this.http.get<DashboardI>(environment.BACK_URL + '/game/dashboard', {
        headers: this.auth.getHeader(),
      })
    ) as DashboardI;
    this.playerAchievements = this.dashboard.achievements;
    this.winRate = this.dashboard.totalGames === 0 ? 0 : Math.round((this.dashboard.totalWins / this.dashboard.totalGames) * 100);
  }

  openAchievementsDialog() {
    this.dialog.open(this.achievementsDialog);
  }

  onCancelClick() {
    this.dialog.closeAll();
  }

  isAchievementUnlocked(achievement: string): boolean {
    return this.playerAchievements.includes(achievement);
  }
}