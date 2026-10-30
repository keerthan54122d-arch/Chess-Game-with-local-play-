import React, { useState } from 'react';
import { X, Trophy, Flame, Swords, Shield, RotateCcw, Award, Clock } from 'lucide-react';
import { PlayerStats } from '../../types/chess';
import { resetPlayerStats } from '../../services/storage';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onStatsReset: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onStatsReset,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const whiteTotal = stats.whiteWins + stats.whiteLosses + stats.whiteDraws;
  const whiteWinRate = whiteTotal > 0 ? Math.round((stats.whiteWins / whiteTotal) * 100) : 0;
  const blackTotal = stats.blackWins + stats.blackLosses + stats.blackDraws;
  const blackWinRate = blackTotal > 0 ? Math.round((stats.blackWins / blackTotal) * 100) : 0;

  // Derive Rank Title
  let rankTitle = 'Novice Player';
  if (stats.gamesPlayed >= 50 && winRate >= 70) rankTitle = 'Grandmaster';
  else if (stats.gamesPlayed >= 30 && winRate >= 60) rankTitle = 'International Master';
  else if (stats.gamesPlayed >= 15 && winRate >= 50) rankTitle = 'Candidate Master';
  else if (stats.gamesPlayed >= 5) rankTitle = 'Club Player';

  const formatPlayTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  };

  const handleReset = () => {
    resetPlayerStats();
    setConfirmReset(false);
    onStatsReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Player Statistics</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Rank Card */}
        <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 bg-slate-950 shadow-md">
            <img
              src="/src/assets/images/chess_trophy_mastery_1793393723318.jpg"
              alt="Chess Mastery Trophy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Rank Classification
              </span>
            </div>
            <div className="text-xl font-bold font-display text-slate-100 mt-0.5">{rankTitle}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>{stats.gamesPlayed} Matches Played</span>
              <span>·</span>
              <span>{winRate}% Victory Ratio</span>
            </div>
          </div>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] font-medium text-slate-400">Wins</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.wins}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] font-medium text-slate-400">Losses</span>
            <div className="text-xl font-bold font-mono text-red-400 mt-0.5">{stats.losses}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] font-medium text-slate-400">Draws</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{stats.draws}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] font-medium text-slate-400">Win Rate</span>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{winRate}%</div>
          </div>
        </div>

        {/* Streaks & Records */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Win Streak</div>
              <div className="text-sm font-bold text-slate-200">
                Current: <span className="text-amber-400 font-mono">{stats.currentStreak}</span> · Best:{' '}
                <span className="text-amber-400 font-mono">{stats.bestStreak}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Playtime</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {formatPlayTime(stats.totalPlayTimeSeconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Performance By Color */}
        <div className="mb-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Performance by Color
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-300">As White</span>
                <span className="font-mono text-slate-400">
                  {stats.whiteWins}W - {stats.whiteLosses}L ({whiteWinRate}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{ width: `${whiteWinRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-300">As Black</span>
                <span className="font-mono text-slate-400">
                  {stats.blackWins}W - {stats.blackLosses}L ({blackWinRate}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all"
                  style={{ width: `${blackWinRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Performance by AI Difficulty */}
        <div className="mb-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            vs AI Opponents
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['novice', 'intermediate', 'advanced', 'master'] as const).map((diff) => {
              const diffStats = stats.byDifficulty[diff];
              const total = diffStats.wins + diffStats.losses + diffStats.draws;
              const rate = total > 0 ? Math.round((diffStats.wins / total) * 100) : 0;
              return (
                <div key={diff} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[11px] font-semibold capitalize text-slate-300">{diff}</div>
                  <div className="text-xs font-mono text-amber-400 font-bold mt-1">
                    {diffStats.wins}W / {diffStats.losses}L
                  </div>
                  <div className="text-[10px] text-slate-500">{rate}% win</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Statistics</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Confirm reset?</span>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-bold rounded-md bg-red-600 hover:bg-red-500 text-white"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
