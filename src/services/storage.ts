import { GameRecord, PlayerStats, AIDifficulty, GameMode } from '../types/chess';

const STORAGE_KEYS = {
  HISTORY: 'gm_chess_history_v1',
  STATS: 'gm_chess_stats_v1',
  BOARD_THEME: 'gm_chess_theme_v1',
};

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  whiteWins: 0,
  whiteLosses: 0,
  whiteDraws: 0,
  blackWins: 0,
  blackLosses: 0,
  blackDraws: 0,
  byDifficulty: {
    novice: { wins: 0, losses: 0, draws: 0 },
    intermediate: { wins: 0, losses: 0, draws: 0 },
    advanced: { wins: 0, losses: 0, draws: 0 },
    master: { wins: 0, losses: 0, draws: 0 },
  },
  byMode: {
    ai: { wins: 0, losses: 0, draws: 0 },
    local: { wins: 0, losses: 0, draws: 0 },
    bluetooth: { wins: 0, losses: 0, draws: 0 },
    nearby_room: { wins: 0, losses: 0, draws: 0 },
  },
  byTimeControl: {
    bullet: { wins: 0, losses: 0, draws: 0 },
    blitz: { wins: 0, losses: 0, draws: 0 },
    rapid: { wins: 0, losses: 0, draws: 0 },
    classical: { wins: 0, losses: 0, draws: 0 },
    untimed: { wins: 0, losses: 0, draws: 0 },
  },
  fastestWinMoves: null,
  longestGameMoves: 0,
  totalPlayTimeSeconds: 0,
};

export function getStoredHistory(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load chess history:', e);
    return [];
  }
}

export function saveGameToHistory(game: GameRecord): void {
  try {
    const current = getStoredHistory();
    const updated = [game, ...current].slice(0, 100); // keep last 100 games
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    updateStatsWithGame(game);
  } catch (e) {
    console.error('Failed to save game to history:', e);
  }
}

export function clearGameHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}

export function getStoredStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load stats:', e);
    return DEFAULT_STATS;
  }
}

function updateStatsWithGame(game: GameRecord): void {
  const stats = getStoredStats();

  stats.gamesPlayed += 1;
  stats.totalPlayTimeSeconds += game.durationSeconds || 0;

  if (game.movesCount > stats.longestGameMoves) {
    stats.longestGameMoves = game.movesCount;
  }

  // Result tracking
  if (game.result === 'win') {
    stats.wins += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    if (!stats.fastestWinMoves || game.movesCount < stats.fastestWinMoves) {
      stats.fastestWinMoves = game.movesCount;
    }
    if (game.playerColor === 'w') stats.whiteWins += 1;
    else stats.blackWins += 1;
  } else if (game.result === 'loss') {
    stats.losses += 1;
    stats.currentStreak = 0;
    if (game.playerColor === 'w') stats.whiteLosses += 1;
    else stats.blackLosses += 1;
  } else if (game.result === 'draw') {
    stats.draws += 1;
    if (game.playerColor === 'w') stats.whiteDraws += 1;
    else stats.blackDraws += 1;
  }

  // Mode breakdown
  if (stats.byMode[game.mode]) {
    if (game.result === 'win') stats.byMode[game.mode].wins += 1;
    else if (game.result === 'loss') stats.byMode[game.mode].losses += 1;
    else if (game.result === 'draw') stats.byMode[game.mode].draws += 1;
  }

  // Difficulty breakdown if vs AI
  if (game.mode === 'ai' && game.difficulty && stats.byDifficulty[game.difficulty]) {
    if (game.result === 'win') stats.byDifficulty[game.difficulty].wins += 1;
    else if (game.result === 'loss') stats.byDifficulty[game.difficulty].losses += 1;
    else if (game.result === 'draw') stats.byDifficulty[game.difficulty].draws += 1;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to update stats in localStorage:', e);
  }
}

export function resetPlayerStats(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
  } catch (e) {
    console.error('Failed to reset stats:', e);
  }
}

export function getStoredTheme(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.BOARD_THEME) || 'tournament_wood';
  } catch {
    return 'tournament_wood';
  }
}

export function saveStoredTheme(theme: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOARD_THEME, theme);
  } catch {
    // ignore
  }
}
