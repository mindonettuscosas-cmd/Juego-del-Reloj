
import React from 'react';
import { GameSettings, GameMode, Difficulty } from '../types';
import { Settings, Play, Users, Shield, Zap } from 'lucide-react';

interface MenuProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  onStart: () => void;
}

const Menu: React.FC<MenuProps> = ({ settings, setSettings, onStart }) => {
  return (
    <div className="max-w-xl w-full bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border-2 border-slate-700 shadow-2xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl arcade-font text-yellow-400 mb-2 tracking-tighter drop-shadow-lg">EL JUEGO DEL RELOJ</h1>
        <p className="text-slate-400">¡Salta la cuerda, sobrevive al tiempo!</p>
      </div>

      <div className="space-y-6">
        {/* Players */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-2 uppercase">
            <Users size={16} /> Jugadores (1-8)
          </label>
          <input 
            type="range" min="1" max="8" 
            value={settings.playerCount} 
            onChange={(e) => setSettings({...settings, playerCount: parseInt(e.target.value)})}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          />
          <div className="flex justify-between mt-1 text-xs text-slate-500 font-bold">
            {Array.from({length: 8}).map((_, i) => (
              <span key={i} className={settings.playerCount === i + 1 ? 'text-yellow-400' : ''}>{i + 1}</span>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-2 uppercase">
            <Shield size={16} /> Modo de Juego
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setSettings({...settings, mode: GameMode.ELIMINATION})}
              className={`py-3 px-4 rounded-xl border-2 transition-all ${settings.mode === GameMode.ELIMINATION ? 'bg-red-900/30 border-red-500 text-red-100' : 'bg-slate-700 border-transparent text-slate-400'}`}
            >
              Eliminación
            </button>
            <button 
              onClick={() => setSettings({...settings, mode: GameMode.LIVES})}
              className={`py-3 px-4 rounded-xl border-2 transition-all ${settings.mode === GameMode.LIVES ? 'bg-blue-900/30 border-blue-500 text-blue-100' : 'bg-slate-700 border-transparent text-slate-400'}`}
            >
              Vidas ({settings.initialLives})
            </button>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-2 uppercase">
            <Zap size={16} /> Dificultad
          </label>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(Difficulty).map(d => (
              <button 
                key={d}
                onClick={() => setSettings({...settings, difficulty: d})}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all ${settings.difficulty === d ? 'bg-yellow-400 border-yellow-300 text-slate-900' : 'bg-slate-700 border-transparent text-slate-400'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={onStart}
        className="w-full mt-10 py-5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-xl arcade-font text-xl transition-all shadow-lg hover:scale-[1.02] flex items-center justify-center gap-4"
      >
        <Play fill="currentColor" /> JUGAR AHORA
      </button>

      <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-yellow-400 font-bold uppercase">Consejo:</span> Cada jugador tiene su propia tecla. Asegúrate de estar listo antes de que la cuerda empiece a girar.
        </p>
      </div>
    </div>
  );
};

export default Menu;
