
export enum GameMode {
  ELIMINATION = 'ELIMINATION',
  LIVES = 'LIVES'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface Player {
  id: number;
  key: string;
  angle: number; // in radians
  lives: number;
  isJumping: boolean;
  jumpStartTime: number;
  cooldownUntil: number;
  isActive: boolean;
  isEliminated: boolean;
  survivalTime: number;
  color: string;
}

export interface GameSettings {
  playerCount: number;
  mode: GameMode;
  initialLives: number;
  difficulty: Difficulty;
}

export interface GameConfig {
  ropeSpeed: number;
  acceleration: number;
  directionChangeProb: number;
  telegraphDuration: number;
}
