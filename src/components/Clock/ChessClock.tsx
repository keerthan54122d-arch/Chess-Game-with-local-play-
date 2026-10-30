import React from 'react';
import { PieceIcon } from '../ChessBoard/PieceIcons';
import { PieceColor, TimerConfig } from '../../types/chess';

interface ChessClockProps {
  whiteTime: number; // in seconds
  blackTime: number;
  activeColor: PieceColor;
  timerConfig: TimerConfig;
  whiteCaptured: string[];
  blackCaptured: string[];
  whitePlayerName: string;
  blackPlayerName: string;
  isGameOver: boolean;
}

// Compute material advantage in points (Pawn=1, N=3, B=3, R=5, Q=9)
const PIECE_PTS: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (seconds < 20) {
    const tenths = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ChessClock: React.FC<ChessClockProps> = ({
  whiteTime,
  blackTime,
  activeColor,
  timerConfig,
  whiteCaptured,
  blackCaptured,
  whitePlayerName,
  blackPlayerName,
  isGameOver,
}) => {
  // Material advantage
  const whiteScore = whiteCaptured.reduce((sum, p) => sum + (PIECE_PTS[p] || 0), 0);
  const blackScore = blackCaptured.reduce((sum, p) => sum + (PIECE_PTS[p] || 0), 0);
  const materialDiff = whiteScore - blackScore;

  const renderPlayerBar = (
    color: PieceColor,
    name: string,
    time: number,
    capturedByThisPlayer: string[],
    advantage: number
  ) => {
    const isActive = !isGameOver && activeColor === color;
    const isLowTime = timerConfig.enabled && time < 30 && time > 0;

    return (
      <div
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isActive
            ? 'bg-slate-800/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
            : 'bg-slate-900/60 border-slate-800 text-slate-300'
        }`}
      >
        {/* Left: Player Identity & Captured Pieces */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              color === 'w' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'bg-slate-950 text-slate-100 border border-slate-700'
            }`}
          >
            {color === 'w' ? 'W' : 'B'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 truncate">{name}</span>
              {isActive && (
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>

            {/* Captured Pieces & Score Advantage */}
            <div className="flex items-center gap-1 mt-0.5 h-4">
              <div className="flex items-center -space-x-1 overflow-hidden">
                {capturedByThisPlayer.map((p, idx) => (
                  <div key={idx} className="w-4 h-4 shrink-0">
                    <PieceIcon type={p as any} color={color === 'w' ? 'b' : 'w'} />
                  </div>
                ))}
              </div>
              {advantage > 0 && (
                <span className="text-[11px] font-mono font-bold text-amber-400 ml-1">
                  +{advantage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Timer Display */}
        <div className="text-right shrink-0">
          {timerConfig.enabled ? (
            <div
              className={`px-3 py-1.5 rounded-lg font-mono tabular-nums text-lg font-bold border transition-colors ${
                isLowTime
                  ? 'bg-red-950/70 text-red-400 border-red-700/60 animate-pulse'
                  : isActive
                  ? 'bg-slate-950 text-amber-300 border-slate-700'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800'
              }`}
            >
              {formatTime(time)}
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-950/60 rounded-md border border-slate-800">
              Untimed
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-[560px] mx-auto">
      {/* Black Player Clock (Top) */}
      {renderPlayerBar('b', blackPlayerName, blackTime, blackCaptured, -materialDiff)}

      {/* White Player Clock (Bottom) */}
      {renderPlayerBar('w', whitePlayerName, whiteTime, whiteCaptured, materialDiff)}
    </div>
  );
};
