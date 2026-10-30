import React, { useState } from 'react';
import { X, History, Trophy, Calendar, Clock, ChevronRight, Trash2 } from 'lucide-react';
import { GameRecord } from '../../types/chess';
import { clearGameHistory } from '../../services/storage';

interface GameHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GameRecord[];
  onSelectGame: (game: GameRecord) => void;
  onHistoryCleared: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectGame,
  onHistoryCleared,
}) => {
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'ai' | 'multiplayer'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredHistory = history.filter((g) => {
    if (filter === 'win') return g.result === 'win';
    if (filter === 'loss') return g.result === 'loss';
    if (filter === 'ai') return g.mode === 'ai';
    if (filter === 'multiplayer') return g.mode !== 'ai';
    return true;
  });

  const handleClear = () => {
    clearGameHistory();
    setConfirmClear(false);
    onHistoryCleared();
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Match History & Reviews</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'win', label: 'Wins' },
                { id: 'loss', label: 'Losses' },
                { id: 'ai', label: 'vs AI' },
                { id: 'multiplayer', label: 'Multiplayer' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === tab.id
                    ? 'bg-slate-800 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {history.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          {confirmClear && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Clear all?</span>
              <button
                onClick={handleClear}
                className="px-2 py-0.5 text-xs font-bold rounded-md bg-red-600 hover:bg-red-500 text-white"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-0.5 text-xs rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Game List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No matches found in history. Play a game to record stats and reviews!
            </div>
          ) : (
            filteredHistory.map((game) => {
              const isWin = game.result === 'win';
              const isLoss = game.result === 'loss';
              const resultColor = isWin
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80'
                : isLoss
                ? 'text-red-400 bg-red-950/60 border-red-800/80'
                : 'text-amber-400 bg-amber-950/60 border-amber-800/80';

              return (
                <div
                  key={game.id}
                  onClick={() => {
                    onSelectGame(game);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Result Tag */}
                    <div
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border uppercase shrink-0 ${resultColor}`}
                    >
                      {game.result}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100 truncate">
                          vs {game.opponentName}
                        </span>
                        {game.difficulty && (
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-300">
                            {game.difficulty}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{game.date}</span>
                        </span>
                        <span>·</span>
                        <span>{game.movesCount} moves</span>
                        <span>·</span>
                        <span className="capitalize">{game.reason?.replace(/_/g, ' ') || 'normal'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0">
                    <span className="text-xs font-medium hidden sm:inline">Review & Analysis</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>{filteredHistory.length} matches recorded</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
