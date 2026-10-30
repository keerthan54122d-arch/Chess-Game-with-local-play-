export type GameMode = 'ai' | 'local' | 'bluetooth' | 'nearby_room';
export type AIDifficulty = 'novice' | 'intermediate' | 'advanced' | 'master';
export type PieceColor = 'w' | 'b';
export type TimePreset =
  | 'none'
  | 'bullet_1'
  | 'bullet_2_1'
  | 'blitz_3'
  | 'blitz_3_2'
  | 'blitz_5'
  | 'rapid_10'
  | 'rapid_15_10'
  | 'classical_30'
  | 'custom';

export interface TimerConfig {
  enabled: boolean;
  preset: TimePreset;
  initialMinutes: number;
  incrementSeconds: number;
}

export type GameResult = 'win' | 'loss' | 'draw' | null;
export type GameOverReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'threefold_repetition'
  | 'insufficient_material'
  | 'fifty_move_rule'
  | 'agreement'
  | null;

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: PieceColor;
  captured?: string;
  promotion?: string;
  fenAfter: string;
  evalScore?: number;
  evalClassification?: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  timeSpent?: number;
}

export interface GameRecord {
  id: string;
  date: string;
  timestamp: number;
  mode: GameMode;
  difficulty?: AIDifficulty;
  playerColor: PieceColor;
  opponentName: string;
  result: GameResult;
  reason: GameOverReason;
  movesCount: number;
  durationSeconds: number;
  pgn: string;
  moves: MoveRecord[];
  aiAnalysis?: GeminiCoachAnalysis;
}

export interface GeminiCoachAnalysis {
  openingName: string;
  playerAccuracy: number;
  headline: string;
  keyTurningPoint: string;
  coachCritique: string;
  topAdvice: string[];
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  whiteWins: number;
  whiteLosses: number;
  whiteDraws: number;
  blackWins: number;
  blackLosses: number;
  blackDraws: number;
  byDifficulty: Record<AIDifficulty, { wins: number; losses: number; draws: number }>;
  byMode: Record<GameMode, { wins: number; losses: number; draws: number }>;
  byTimeControl: {
    bullet: { wins: number; losses: number; draws: number };
    blitz: { wins: number; losses: number; draws: number };
    rapid: { wins: number; losses: number; draws: number };
    classical: { wins: number; losses: number; draws: number };
    untimed: { wins: number; losses: number; draws: number };
  };
  fastestWinMoves: number | null;
  longestGameMoves: number;
  totalPlayTimeSeconds: number;
}

export type BoardTheme = 'tournament_wood' | 'emerald_classic' | 'midnight_slate' | 'carbon_dark';
