
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, GameMode, Difficulty, Player, GameSettings } from './types';
import { PLAYER_KEYS, PLAYER_COLORS, DIFFICULTY_CONFIGS, JUMP_DURATION, JUMP_COOLDOWN } from './constants';
import GameCanvas from './components/GameCanvas';
import Menu from './components/Menu';
import Sidebar from './components/Sidebar';
import { audioService } from './services/audioService';
import { getCoachCommentary } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [settings, setSettings] = useState<GameSettings>({
    playerCount: 1,
    mode: GameMode.ELIMINATION,
    initialLives: 3,
    difficulty: Difficulty.NORMAL
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('clock_game_highscore')) || 0;
  });
  const [coachMsg, setCoachMsg] = useState<string>("");

  const startGame = () => {
    const initialPlayers: Player[] = Array.from({ length: settings.playerCount }).map((_, i) => ({
      id: i + 1,
      key: PLAYER_KEYS[i],
      angle: (i / settings.playerCount) * Math.PI * 2,
      lives: settings.initialLives,
      isJumping: false,
      jumpStartTime: 0,
      cooldownUntil: 0,
      isActive: true,
      isEliminated: false,
      survivalTime: 0,
      color: PLAYER_COLORS[i]
    }));
    setPlayers(initialPlayers);
    setStatus(GameStatus.PLAYING);
    setCoachMsg("");
  };

  const handleGameOver = async (finalPlayers: Player[]) => {
    setStatus(GameStatus.GAME_OVER);
    const bestSurvivor = [...finalPlayers].sort((a, b) => b.survivalTime - a.survivalTime)[0];
    
    if (settings.playerCount === 1 && bestSurvivor.survivalTime > highScore) {
      setHighScore(bestSurvivor.survivalTime);
      localStorage.setItem('clock_game_highscore', bestSurvivor.survivalTime.toFixed(0));
    }

    const comment = await getCoachCommentary(bestSurvivor.survivalTime, settings.playerCount, settings.difficulty);
    setCoachMsg(comment);
  };

  const resetGame = () => {
    setStatus(GameStatus.MENU);
    setPlayers([]);
  };

  const togglePause = useCallback(() => {
    setStatus(prev => {
      if (prev === GameStatus.PLAYING) return GameStatus.PAUSED;
      if (prev === GameStatus.PAUSED) return GameStatus.PLAYING;
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
      if (e.key.toLowerCase() === 'r') {
        resetGame();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [togglePause]);

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar 
        status={status}
        players={players} 
        settings={settings}
        highScore={highScore}
      />
      
      <main className="flex-1 relative flex items-center justify-center p-4">
        {status === GameStatus.MENU && (
          <Menu 
            settings={settings} 
            setSettings={setSettings} 
            onStart={startGame} 
          />
        )}

        {(status === GameStatus.PLAYING || status === GameStatus.PAUSED || status === GameStatus.GAME_OVER) && (
          <GameCanvas 
            status={status}
            players={players}
            setPlayers={setPlayers}
            settings={settings}
            onGameOver={handleGameOver}
          />
        )}

        {status === GameStatus.PAUSED && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
            <h2 className="text-6xl arcade-font mb-8 text-yellow-400 animate-pulse">PAUSA</h2>
            <p className="text-xl">Presiona ESPACIO para continuar</p>
          </div>
        )}

        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-6 text-center">
            <h2 className="text-5xl arcade-font mb-4 text-red-500">¡FIN DE PARTIDA!</h2>
            {coachMsg && (
              <div className="max-w-md bg-slate-800 p-6 rounded-xl border-2 border-slate-700 shadow-2xl mb-8">
                <p className="text-slate-400 italic mb-2">Comentario del Coach:</p>
                <p className="text-2xl font-bold text-cyan-400">"{coachMsg}"</p>
              </div>
            )}
            <div className="flex gap-4">
              <button 
                onClick={startGame}
                className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-lg text-xl font-bold transition-all transform hover:scale-105"
              >
                Volver a Jugar
              </button>
              <button 
                onClick={resetGame}
                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-xl font-bold transition-all transform hover:scale-105"
              >
                Menú Principal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
