import React from 'react';
import { RotateCw, Undo2, Flag, Handshake, Volume2, VolumeX, SlidersHorizontal, Plus } from 'lucide-react';
import { GameMode } from '../../types/chess';

interface GameControlsProps {
  onNewGame: () => void;
  onFlipBoard: () => void;
  onUndoMove: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onOpenTimerSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  canUndo: boolean;
  isGameOver: boolean;
  gameMode: GameMode;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onNewGame,
  onFlipBoard,
  onUndoMove,
  onResign,
  onOfferDraw,
  onOpenTimerSettings,
  isMuted,
  onToggleMute,
  canUndo,
  isGameOver,
  gameMode,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs w-full max-w-[560px] mx-auto">
      {/* Primary Action: New Game */}
      <button
        onClick={onNewGame}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-xs"
        title="Start a new match"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Match</span>
      </button>

      {/* Secondary Actions */}
      <div className="flex items-center gap-1">
        {/* Undo (for AI and Local mode) */}
        {(gameMode === 'ai' || gameMode === 'local') && (
          <button
            onClick={onUndoMove}
            disabled={!canUndo || isGameOver}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Takeback / Undo move"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        )}

        {/* Flip Board */}
        <button
          onClick={onFlipBoard}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Flip board view"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Timer & Preferences */}
        <button
          onClick={onOpenTimerSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Customise timer and controls"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {!isGameOver && (
          <>
            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Offer Draw */}
            <button
              onClick={onOfferDraw}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Offer Draw"
            >
              <Handshake className="w-4 h-4" />
            </button>

            {/* Resign */}
            <button
              onClick={onResign}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Resign Match"
            >
              <Flag className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
