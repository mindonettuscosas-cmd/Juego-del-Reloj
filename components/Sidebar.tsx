
import React from 'react';
import { GameStatus, Player, GameSettings, GameMode } from '../types';
import { Trophy, Info, Keyboard, Activity } from 'lucide-react';

interface SidebarProps {
  status: GameStatus;
  players: Player[];
  settings: GameSettings;
  highScore: number;
}

const Sidebar: React.FC<SidebarProps> = ({ status, players, settings, highScore }) => {
  return (
    <aside className="w-80 h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 overflow-y-auto">
      <div>
        <h2 className="flex items-center gap-2 text-slate-400 uppercase text-xs font-black tracking-widest mb-4">
          <Trophy size={14} className="text-yellow-500" /> Marcadores
        </h2>
        
        {settings.playerCount === 1 && (
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Récord Personal</p>
            <p className="text-2xl arcade-font text-yellow-500">{highScore.toFixed(0)}s</p>
          </div>
        )}

        <div className="space-y-2">
          {players.length > 0 ? (
            players.map((p) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-lg border border-slate-800 transition-opacity ${p.isEliminated ? 'opacity-40 grayscale' : 'bg-slate-800/30'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-lg" style={{backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}`}} />
                  <span className="text-xs font-bold text-slate-300">P{p.id}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs arcade-font text-white">{p.survivalTime.toFixed(1)}s</p>
                  {settings.mode === GameMode.LIVES && (
                    <div className="flex gap-1 mt-1 justify-end">
                      {Array.from({length: settings.initialLives}).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < p.lives ? 'bg-red-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600 italic">Esperando inicio...</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 text-slate-400 uppercase text-xs font-black tracking-widest mb-4">
          <Keyboard size={14} className="text-cyan-500" /> Controles
        </h2>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {Array.from({length: settings.playerCount}).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-2 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-500 mb-1">P{i+1}</span>
              <kbd className="px-2 py-1 bg-slate-700 text-white rounded font-mono text-xs shadow">
                {['A','S','D','F','J','K','L',';'][i]}
              </kbd>
            </div>
          ))}
        </div>
        <div className="space-y-3 text-sm text-slate-400">
          <div className="flex justify-between items-center">
            <span>Pausar</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">Espacio</kbd>
          </div>
          <div className="flex justify-between items-center">
            <span>Reiniciar</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">R</kbd>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <h2 className="flex items-center gap-2 text-slate-400 uppercase text-xs font-black tracking-widest mb-3">
          <Info size={14} className="text-slate-500" /> Instrucciones
        </h2>
        <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
          <li>• Salta cuando la cuerda pase por tu posición.</li>
          <li>• En <span className="text-slate-300 font-bold">NORMAL</span> y <span className="text-slate-300 font-bold">HARD</span>, la cuerda puede cambiar de dirección.</li>
          <li>• ¡Busca el sector rojo de aviso para anticiparte!</li>
          <li>• El juego se acelera con cada segundo.</li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
