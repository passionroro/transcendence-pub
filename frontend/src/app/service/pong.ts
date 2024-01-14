import { PlayService } from './play.service';
import { GameI, Paddle, Ball, GameState, GameInfo } from '../interfaces';
import { Subscription } from 'rxjs';

export class PongGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  game: GameI;
  clientSide: number = 1;

  playerScore: number = 0;
  playerLogin: string;
  opponentScore: number = 0;
  opponentLogin: string;

  l_paddle: Paddle; //player paddle
  r_paddle: Paddle; //opponent paddle
  ball: Ball;

  private playerReadySubscription: Subscription = new Subscription();
  private playerMoveSubscription: Subscription = new Subscription();
  private ballPositionSubscription: Subscription = new Subscription();
  private endMatchSubscription: Subscription = new Subscription();

  isArrowUpPressed: boolean = false;
  isArrowDownPressed: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    game: GameI,
    protected playService: PlayService
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    const height = 40;
    const width = 5;
    this.l_paddle = {
      x: width + 10,
      y: this.canvas.height / 2 - height / 2,
      width: width,
      height: height,
      speed: 2,
    };
    this.r_paddle = {
      x: this.canvas.width - (width * 2) - 10,
      y: this.canvas.height / 2 - height / 2,
      width: width,
      height: height,
      speed: 2,
    };
    this.ball = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      radius: 3,
      dx: 2,
      dy: this.getRandomNonNullInt(-2, 2),
    };
    const login = localStorage.getItem('user') || '';
    this.playerLogin = login;
    this.opponentLogin = login === game.player1Login ? game.player2Login : game.player1Login; 
  }

  getRandomNonNullInt(min: number, max: number): number {
    const rand = Math.floor(Math.random() * (max - min + 1) + min);
    return rand === 0 ? this.getRandomNonNullInt(min, max) : rand;
  }

  async overrideGameObjects() {
    const ballSpeed = 3;
    this.ball.dx = ballSpeed,
    this.ball.dy = this.getRandomNonNullInt(-ballSpeed, ballSpeed),
    this.l_paddle.speed = 3;
    this.r_paddle.speed = 3;

    const height = 25;
    const width = 3;
    this.l_paddle = {
      x: width + 10,
      y: this.canvas.height / 2 - height / 2,
      width: width,
      height: height,
      speed: 3,
    };
    this.r_paddle = {
      x: this.canvas.width - (width * 2) - 10,
      y: this.canvas.height / 2 - height / 2,
      width: width,
      height: height,
      speed: 3,
    };
  }

  async playerReady() {
    this.registerUserInput();
    this.gameSubscriptions();
    if (this.game.mode === 'xtra') {
      await this.overrideGameObjects();
    }
    await this.playService.playerReady(this.createGameInfo());
  }

  createGameInfo(): GameInfo {
    return {
      id: this.game.id.toString(),
      height: this.canvas.height,
      width: this.canvas.width,
      playerLogin: this.playerLogin,
      opponentLogin: this.opponentLogin,
      state: {
        ball: this.ball,
        l_paddle: this.l_paddle,
        r_paddle: this.r_paddle,
      } as GameState,
    };
  }

  async initGame(player: string) {
    this.initBallDirection(player);
    this.gameLoop();
  }

  initBallDirection(player: string) {
    if (this.playerLogin === player) {
      this.clientSide = 1
    } else {
      this.clientSide = -1
    }
  }

  gameLoop = () => {
    this.updatePaddles();
    this.clearCanvas();
    this.render();
    window.requestAnimationFrame(this.gameLoop);
  };

  async endMatch(winner: string) {
    const continueMatch: boolean = this.updateScore(winner);
    if (continueMatch === true) {
      this.resetGameObjects(winner);
      await this.playService.playerReady(this.createGameInfo());
    } else {
      await this.endGame();
    }
    this.clearCanvas();
  }

  async endGame() {
    await this.playService.registerGame(this.game);
    this.unsubscribeFromEvents();
    this.clearCanvas();
  }

  updateScore(winner: string): boolean {
    if (winner === this.playerLogin) {
      this.playerScore += 1;
      this.playService.updateScore(this.game.id.toString(), this.playerScore, winner);
    } else if (winner === this.opponentLogin) {
      this.opponentScore += 1;
      this.playService.updateScore(this.game.id.toString(), this.opponentScore, winner);
    }

    if (this.playerScore === 3 || this.opponentScore === 3) {
      this.game.score = `${this.playerScore}-${this.opponentScore}`;
      this.game.winner = winner;
      return false;
    }

    return true;
  }

  async updatePaddles() {
    if (this.isArrowUpPressed || this.isArrowDownPressed) {
      const p: Paddle = this.l_paddle;
      if (this.isArrowUpPressed && p.y > 0) {
        await this.playService.playerMoved(this.game.id.toString(), p.y - p.speed, this.playerLogin);
      } else if (this.isArrowDownPressed && p.y < this.canvas.height - p.height) {
        await this.playService.playerMoved(this.game.id.toString(), p.y + p.speed, this.playerLogin);
      }
    }
  }

  render() {
    this.drawBackground();
    this.drawPaddles();
    this.drawBall();
  }

  /* DRAWING */
  drawBackground() {
    const ctx = this.ctx as CanvasRenderingContext2D;
    // Left/right borders
    ctx.fillStyle = '#8a2be244';
    ctx.fillRect(0, 0, 10, this.canvas.height);
    ctx.fillRect(this.canvas.width - 10, 0, 10, this.canvas.height);

    // Middle circle
    ctx.beginPath();
    ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 40, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // Middle line
    const lineThickness = 2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(this.canvas.width / 2 - lineThickness / 2, 0, lineThickness, this.canvas.height);
  }

  drawPaddles() {
    const ctx = this.ctx as CanvasRenderingContext2D;
    ctx.fillStyle = '#8a2be2ee';
    ctx.fillRect(
      this.l_paddle.x,
      this.l_paddle.y,
      this.l_paddle.width,
      this.l_paddle.height
    );
    ctx.fillRect(
      this.r_paddle.x,
      this.r_paddle.y,
      this.r_paddle.width,
      this.r_paddle.height
    );
  }

  drawBall() {
    const ctx = this.ctx as CanvasRenderingContext2D;
    const ball = this.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000fff';
    ctx.fill();
    ctx.closePath();
  }


  /* UTILS */
  clearCanvas() {
    const ctx = this.ctx as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  registerUserInput() {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp') {
        this.isArrowUpPressed = true;
      } else if (event.key === 'ArrowDown') {
        this.isArrowDownPressed = true;
      }
    });
    window.addEventListener('keyup', (event) => {
      if (event.key === 'ArrowUp') {
        this.isArrowUpPressed = false;
      } else if (event.key === 'ArrowDown') {
        this.isArrowDownPressed = false;
      }
    });
  }

  resetGameObjects(winner: string) {
    const ballSpeed = this.game.mode === 'xtra' ? 3 : 2;
    this.ball = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      radius: 3,
      dx: winner === this.opponentLogin ? ballSpeed : -ballSpeed,
      dy: this.getRandomNonNullInt(-ballSpeed, ballSpeed),
    };
    this.l_paddle.y = this.canvas.height / 2 - this.l_paddle.height / 2;
    this.r_paddle.y = this.l_paddle.y;
  }

  /* EVENTS */
  gameSubscriptions() {
    this.playerMoveSubscription = this.playService
      .getPlayerMoved()
      .subscribe((data: any) => {
        if (data.login !== this.playerLogin) {
          this.r_paddle.y = data.position;
        } else {
          this.l_paddle.y = data.position;
        }
      });
    this.playerReadySubscription = this.playService
      .getPlayerReady()
      .subscribe((login: string) => {
        this.initGame(login);
      });
    this.ballPositionSubscription = this.playService
      .getBallPosition()
      .subscribe((ball: Ball) => {
        this.ball.x = this.clientSide === -1 ? ball.x : this.canvas.width - ball.x;
        this.ball.y = ball.y;
      })
    this.endMatchSubscription = this.playService
      .getEndMatch()
      .subscribe((winner: string) => {
        this.endMatch(winner);
      });
  }

  unsubscribeFromEvents() {
    this.playerMoveSubscription.unsubscribe();
    this.playerReadySubscription.unsubscribe();
    this.ballPositionSubscription.unsubscribe();
    this.endMatchSubscription.unsubscribe();
  }
}