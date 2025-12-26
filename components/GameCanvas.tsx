
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
  
  // Lógica de Física interna
  const ropeAngleRef = useRef<number>(0);
  const ropeSpeedRef = useRef<number>(DIFFICULTY_CONFIGS[settings.difficulty].ropeSpeed);
  const ropeDirectionRef = useRef<number>(1);
  const startTimeRef = useRef<number>(Date.now());
  const lastTimeRef = useRef<number>(Date.now());
  
  // Lógica de Calentamiento (Primera vuelta segura)
  const warmUpDistanceRef = useRef<number>(0);
  const [isWarmUp, setIsWarmUp] = useState(true);
  const [showGo, setShowGo] = useState(false);

  // Lógica de Aviso de cambio de dirección
  const [warning, setWarning] = useState(false);
  const isChangingDirectionRef = useRef(false);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Reiniciar física al empezar o reiniciar
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      ropeAngleRef.current = 0;
      warmUpDistanceRef.current = 0;
      setIsWarmUp(true);
      setShowGo(false);
      ropeSpeedRef.current = DIFFICULTY_CONFIGS[settings.difficulty].ropeSpeed;
      startTimeRef.current = Date.now();
    }
  }, [status, settings.difficulty]);

  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;

    const now = Date.now();
    const dt = (now - lastTimeRef.current) / 16.67;
    lastTimeRef.current = now;

    const config = DIFFICULTY_CONFIGS[settings.difficulty];
    
    // 1. Actualizar Cuerda
    if (!isChangingDirectionRef.current) {
      ropeSpeedRef.current += config.acceleration * dt;
      const movement = ropeSpeedRef.current * ropeDirectionRef.current * dt;
      ropeAngleRef.current += movement;
      
      // Control de la vuelta de cortesía
      if (warmUpDistanceRef.current < Math.PI * 2) {
        warmUpDistanceRef.current += Math.abs(movement);
        if (warmUpDistanceRef.current >= Math.PI * 2) {
          setIsWarmUp(false);
          setShowGo(true);
          startTimeRef.current = Date.now(); // El tiempo de supervivencia empieza tras la vuelta
          audioService.playJump(); // Sonido de inicio
          setTimeout(() => setShowGo(false), 1000);
        }
      }
      
      // Cambios de dirección aleatorios (solo tras el calentamiento)
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

    // 2. Colisiones y Estado de Jugadores
    let activePlayersCount = 0;
    const nextPlayers = playersRef.current.map(p => {
      if (p.isEliminated) return p;
      activePlayersCount++;

      let isJumping = p.isJumping;
      if (isJumping && (now - p.jumpStartTime > JUMP_DURATION)) {
        isJumping = false;
      }

      // NO hay colisiones durante isWarmUp
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

    // Sombra del suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 40, 0, Math.PI * 2);
    ctx.fill();

    // Círculo del Reloj
    ctx.strokeStyle = isWarmUp ? 'rgba(34, 211, 238, 0.15)' : 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Telegraph (Aviso de dirección)
    if (warning) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const angle = ropeAngleRef.current;
      const dir = -ropeDirectionRef.current;
      ctx.arc(cx, cy, r + 20, angle, angle + (Math.PI / 2) * dir, dir < 0);
      ctx.fill();
    }

    // Dibujar Jugadores
    playersRef.current.forEach(p => {
      const px = cx + Math.cos(p.angle) * r;
      const py = cy + Math.sin(p.angle) * r;
      
      ctx.save();
      ctx.translate(px, py);
      
      // Salto
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

      // Aura de seguridad durante Warm-up
      if (isWarmUp) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22d3ee';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cuerpo
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Tecla
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.key.toUpperCase(), 0, 35);
      
      ctx.restore();
    });

    // Dibujar Cuerda
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ropeAngleRef.current);
    
    // Sombra cuerda
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r + 20, 10);
    ctx.stroke();

    // Color cuerda (Cian en warm-up, Blanco en juego)
    ctx.strokeStyle = isWarmUp ? '#22d3ee' : '#f8fafc';
    ctx.lineWidth = 4;
    ctx.shadowBlur = isWarmUp ? 15 : 5;
    ctx.shadowColor = isWarmUp ? '#22d3ee' : 'white';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r + 10, 0);
    ctx.stroke();

    // Punta cuerda
    ctx.fillStyle = isWarmUp ? '#67e8f9' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(r + 10, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    // HUD de Calentamiento
    if (isWarmUp) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22d3ee';
      ctx.fillText('¡PREPÁRATE!', cx, cy - 80);
      
      // Anillo de progreso central
      const progress = warmUpDistanceRef.current / (Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, -Math.PI/2, (-Math.PI/2) + (progress * Math.PI * 2));
      ctx.stroke();
      
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText('VUELTA DE SEGURIDAD', cx, cy + 80);
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
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="block cursor-none" />
      
      {/* Aviso de Peligro */}
      {warning && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-2 rounded-full arcade-font text-white animate-bounce shadow-lg border-2 border-white z-20">
          ¡CAMBIO!
        </div>
      )}

      {/* Cartel de YA */}
      {showGo && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <span className="arcade-font text-7xl text-yellow-400 animate-ping drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">¡YA!</span>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;
