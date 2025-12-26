
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameStatus, Player, GameSettings, GameMode } from '../types';
import { DIFFICULTY_CONFIGS, COLLISION_THRESHOLD, JUMP_DURATION, JUMP_COOLDOWN, RADIUS_OFFSET } from '../constants';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  status: GameStatus;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  settings: GameSettings;
  onGameOver: (players: Player[]) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, players, setPlayers, settings, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const playersRef = useRef<Player[]>(players);
  
  // Internal physics state
  const ropeAngleRef = useRef<number>(0);
  const ropeSpeedRef = useRef<number>(DIFFICULTY_CONFIGS[settings.difficulty].ropeSpeed);
  const ropeDirectionRef = useRef<number>(1);
  const startTimeRef = useRef<number>(Date.now());
  const lastTimeRef = useRef<number>(Date.now());
  
  // Warm-up logic: distance to travel before collisions are active (2 * PI = 1 full rotation)
  const warmUpDistanceRef = useRef<number>(0);
  const [isWarmUp, setIsWarmUp] = useState(true);

  // Telegraphing / Change Direction logic
  const [warning, setWarning] = useState(false);
  const isChangingDirectionRef = useRef(false);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Reset physics when game starts/restarts
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      ropeAngleRef.current = 0;
      warmUpDistanceRef.current = 0;
      setIsWarmUp(true);
      startTimeRef.current = Date.now();
    }
  }, [status]);

  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;

    const now = Date.now();
    const dt = (now - lastTimeRef.current) / 16.67;
    lastTimeRef.current = now;

    const config = DIFFICULTY_CONFIGS[settings.difficulty];
    
    // 1. Update Rope
    if (!isChangingDirectionRef.current) {
      ropeSpeedRef.current += config.acceleration * dt;
      const movement = ropeSpeedRef.current * ropeDirectionRef.current * dt;
      ropeAngleRef.current += movement;
      
      // Track warm-up distance
      if (warmUpDistanceRef.current < Math.PI * 2) {
        warmUpDistanceRef.current += Math.abs(movement);
        if (warmUpDistanceRef.current >= Math.PI * 2) {
          setIsWarmUp(false);
          // Actual survival time starts now
          startTimeRef.current = Date.now();
        }
      }
      
      // Random direction change (only after warm-up to keep it simple)
      if (!isWarmUp && config.directionChangeProb > 0 && Math.random() < config.directionChangeProb && !warning) {
        setWarning(true);
        isChangingDirectionRef.current = true;
        audioService.playWarning();
        setTimeout(() => {
          ropeDirectionRef.current *= -1;
          setWarning(false);
          isChangingDirectionRef.current = false;
        }, config.telegraphDuration);
      }
    }

    // 2. Update Players & Check Collisions
    let activePlayersCount = 0;
    const nextPlayers = playersRef.current.map(p => {
      if (p.isEliminated) return p;
      activePlayersCount++;

      let isJumping = p.isJumping;
      if (isJumping && (now - p.jumpStartTime > JUMP_DURATION)) {
        isJumping = false;
      }

      // Check collision ONLY IF warm-up is over
      const dist = Math.abs((ropeAngleRef.current % (Math.PI * 2)) - (p.angle % (Math.PI * 2)));
      const wrappedDist = Math.min(dist, Math.PI * 2 - dist);
      
      let lives = p.lives;
      let isEliminated = p.isEliminated;

      if (!isWarmUp && wrappedDist < COLLISION_THRESHOLD && !isJumping) {
        ropeAngleRef.current += COLLISION_THRESHOLD * ropeDirectionRef.current;
        lives -= 1;
        audioService.playHit();
        
        if (lives <= 0 || settings.mode === GameMode.ELIMINATION) {
          isEliminated = true;
          lives = 0;
        }
      }

      return {
        ...p,
        isJumping,
        lives,
        isEliminated,
        // Survival time only counts after warm-up
        survivalTime: !isEliminated && !isWarmUp ? (now - startTimeRef.current) / 1000 : p.survivalTime
      };
    });

    if (activePlayersCount === 0 && playersRef.current.length > 0) {
      onGameOver(nextPlayers);
    } else {
      setPlayers(nextPlayers);
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [status, settings, onGameOver, warning, isWarmUp]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.4;

    ctx.clearRect(0, 0, w, h);

    // Floor Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 40, 0, Math.PI * 2);
    ctx.fill();

    // Clock Circle
    ctx.strokeStyle = isWarmUp ? 'rgba(34, 211, 238, 0.2)' : 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Telegraph Sector
    if (warning) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const angle = ropeAngleRef.current;
      const dir = -ropeDirectionRef.current;
      ctx.arc(cx, cy, r + 20, angle, angle + (Math.PI / 2) * dir, dir < 0);
      ctx.fill();
    }

    // Players
    playersRef.current.forEach(p => {
      const px = cx + Math.cos(p.angle) * r;
      const py = cy + Math.sin(p.angle) * r;
      
      ctx.save();
      ctx.translate(px, py);
      
      if (p.isJumping) {
        const jumpProgress = (Date.now() - p.jumpStartTime) / JUMP_DURATION;
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 40;
        ctx.translate(0, -jumpHeight);
        ctx.scale(1.1 + Math.sin(jumpProgress * Math.PI) * 0.2, 1.1 + Math.sin(jumpProgress * Math.PI) * 0.2);
      }

      if (p.isEliminated) {
        ctx.globalAlpha = 0.3;
        ctx.scale(0.8, 0.8);
      }

      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.key.toUpperCase(), 0, 35);
      
      ctx.restore();
    });

    // Rope
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ropeAngleRef.current);
    
    // Rope Shadow
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r + 20, 10);
    ctx.stroke();

    // Rope Color (Change based on warm-up state)
    ctx.strokeStyle = isWarmUp ? '#22d3ee' : '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r + 10, 0);
    ctx.stroke();

    // Rope End
    ctx.fillStyle = isWarmUp ? '#67e8f9' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(r + 10, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    // HUD Text for Warm-up
    if (isWarmUp) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22d3ee';
      ctx.fillText('¡PREPÁRATE!', cx, cy - 60);
      
      // Progress bar for warm-up
      const progress = warmUpDistanceRef.current / (Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 50, -Math.PI/2, (-Math.PI/2) + (progress * Math.PI * 2));
      ctx.stroke();
    }
  }, [warning, isWarmUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const key = e.key.toLowerCase();
      const now = Date.now();

      const nextPlayers = playersRef.current.map(p => {
        if (p.key === key && !p.isJumping && now > p.cooldownUntil && !p.isEliminated) {
          audioService.playJump();
          return {
            ...p,
            isJumping: true,
            jumpStartTime: now,
            cooldownUntil: now + JUMP_DURATION + JUMP_COOLDOWN
          };
        }
        return p;
      });
      setPlayers(nextPlayers);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, setPlayers]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
        }
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="block cursor-none" />
      {warning && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-2 rounded-full arcade-font text-white animate-bounce shadow-lg border-2 border-white">
          ¡CUIDADO!
        </div>
      )}
      {!isWarmUp && warmUpDistanceRef.current < (Math.PI * 2 + 0.5) && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="arcade-font text-6xl text-yellow-400 animate-ping">¡YA!</span>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;
