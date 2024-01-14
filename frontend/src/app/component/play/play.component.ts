import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewChild,
AfterViewInit,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { PlayService } from 'src/app/service/play.service';
import { GameI } from 'src/app/interfaces';
import { PongGame } from 'src/app/service/pong';

@Component({
  selector: 'app-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.css'],
})
export class PlayComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('userInQueueDialog') queueDialog!: TemplateRef<any>;
  @ViewChild('leaveGameDialog') leaveGameDialog!: TemplateRef<any>;
  @ViewChild('invitationsDialog') invitationsDialog!: TemplateRef<any>;

  userId: number;
  msg: string | undefined;
  err: string | undefined;

  playerLogin: string = '';
  opponentLogin: string = '';
  playerScore: number = 0;
  opponentScore: number = 0;

  gameMode: string = '';
  gameStarted: boolean = false;
  usersInQueue: number = 0;
  gameInstance: PongGame | undefined;

  private playerLeftSubscription: Subscription = new Subscription();
  private startMatchSubscription: Subscription = new Subscription();
  private usersInQueueSubscription: Subscription = new Subscription();
  private playerScoreSubscription: Subscription = new Subscription();
  private opponentScoreSubscription: Subscription = new Subscription();

  constructor(
    private playService: PlayService,
    private dialog: MatDialog
  ) {
    this.userId = parseInt(localStorage.getItem('id') || '');
  }

  async ngOnInit(): Promise<void> {
    await this.playService.initDashboard();
    this.usersInQueueSubscription = this.playService
      .getUsersInQueue()
      .subscribe((usersInQueue: number) => {
        this.usersInQueue = usersInQueue;
      }
    );
    this.playerLeftSubscription = this.playService
      .getPlayerLeft()
      .subscribe((message: string) => {
        this.dialog.closeAll();
        this.gameStarted = false;
        this.msg = message;
      }
    );
    this.playerScoreSubscription = this.playService
      .getPlayerScore()
      .subscribe((score: number) => {
        this.playerScore = score;
      }
    );
    this.opponentScoreSubscription = this.playService
      .getOpponentScore()
      .subscribe((score: number) => {
        this.opponentScore = score;
      }
    );
  }

  async ngAfterViewInit(): Promise<void> {
    this.startMatchSubscription = this.playService
      .getStartMatch()
      .subscribe((game: GameI) => {
        this.dialog.closeAll();
        this.setGameInfo(game);
        this.gameStarted = true;
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.gameInstance = new PongGame(canvas, game, this.playService);
        this.gameInstance.playerReady();
      }
    );
  }


  getBackground(): string {
    if (this.gameMode === 'xtra') {
      return 'rgba(255, 66, 66, 0.8)';
    } else {
      return 'rgba(240, 248, 255, 0.8)';
    }
  }

  private async setGameInfo(game: GameI) {
    const login = localStorage.getItem('user') || '';
    this.playerLogin = login;
    this.opponentLogin = game.player1Login === login ? game.player2Login : game.player1Login;
    if (game.mode) {
      this.gameMode = game.mode;
    }
    this.playerScore = 0;
    this.opponentScore = 0;
  }

  /* DIALOG */
  openUserInQueueDialog(mode: string) {
    this.gameMode = mode;
    this.playService.joinQueue(mode);
    this.dialog.open(this.queueDialog);
  }

  openLeaveGameDialog() {
    this.dialog.open(this.leaveGameDialog);
  }

  onLeaveQueueClick() {
    this.playService.leaveQueue(this.gameMode);
    this.gameMode = '';
    this.dialog.closeAll();
  }

  onLeaveGameClick() {
    this.playService.leaveActiveGame();
    this.dialog.closeAll();
  }

  
  onCancelClick() {
    this.dialog.closeAll();
  }

  ngOnDestroy(): void {
    this.playService.leaveActiveGame();
    this.usersInQueueSubscription.unsubscribe();
    this.startMatchSubscription.unsubscribe();
    this.playerLeftSubscription.unsubscribe();
    this.playerScoreSubscription.unsubscribe();
    this.opponentScoreSubscription.unsubscribe();
  }

}
