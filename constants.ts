
import { Difficulty, GameConfig } from './types';

export const PLAYER_KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
export const PLAYER_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  [Difficulty.EASY]: {
    ropeSpeed: 0.03,
    acceleration: 0.000005,
    directionChangeProb: 0,
    telegraphDuration: 1000,
  },
  [Difficulty.NORMAL]: {
    ropeSpeed: 0.05,
    acceleration: 0.00001,
    directionChangeProb: 0.001,
    telegraphDuration: 800,
  },
  [Difficulty.HARD]: {
    ropeSpeed: 0.07,
    acceleration: 0.00002,
    directionChangeProb: 0.003,
    telegraphDuration: 500,
  },
};

export const JUMP_DURATION = 500; // ms
export const JUMP_COOLDOWN = 150; // ms
export const COLLISION_THRESHOLD = 0.15; // radians (approx 8.5 degrees)
export const RADIUS_OFFSET = 0.8; // Player distance from center relative to canvas size
