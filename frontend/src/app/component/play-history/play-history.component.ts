import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/service/auth.service';
import { GameI } from 'src/app/interfaces';
import { environment } from 'src/environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-play-history',
  templateUrl: './play-history.component.html',
  styleUrls: ['./play-history.component.css'],
})
export class PlayHistoryComponent implements OnInit {
  @Input() dashboardId!: number;
  games: GameI[] = [];

  constructor(private auth: AuthService, private http: HttpClient) {}

  getOpponent(game: GameI) {
    const login = this.dashboardId === game.player1Id ? game.player2Login : game.player1Login;
    const id = this.dashboardId === game.player1Id ? game.player2Id : game.player1Id;
    return { login, id };
  }

  async ngOnInit(): Promise<void> {
    this.games = await lastValueFrom(
      this.http.get<GameI[]>(`${environment.BACK_URL}/game/history/${this.dashboardId}`, {
        headers: this.auth.getHeader(),
      })
    );
  }
}
