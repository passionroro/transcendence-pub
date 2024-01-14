import { Socket } from 'ngx-socket-io';

export interface AchivementsI {
  name: string;
  description: string;   
}

export interface DashboardI {
  id: number;
  userId: number;
  totalGames: number;
  totalWins: number;
  totalLoses: number;
  level: number;
  achievements: string[];
  matchHistory: GameI[];
}

export interface PlayerI {
  id: number;
  login: string;
  socket: Socket;
  score: number;
}

export interface GameI {
  id: number;
  createdAt: Date;
  player1Id: number;
  player2Id: number;
  player1Login: string;
  player2Login: string;
  score: string;
  winner: string;
  player?: PlayerI;
  opponent?: PlayerI;
  opponentLogin?: string;
  mode?: string;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
}

export interface GameInfo {
  id: string;
  height: number;
  width: number;
  playerLogin: string;
  opponentLogin: string;
  winner?: string;
  state: GameState;
}

export interface GameState {
  ball: Ball;
  l_paddle: Paddle;
  r_paddle: Paddle;
}

export interface InviteI {
  socket: Socket,
  name: string,
  mode: string,
}