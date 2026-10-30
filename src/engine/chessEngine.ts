import { Chess, Move } from 'chess.js';
import { AIDifficulty } from '../types/chess';

// Standard piece values in centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (White perspective - 8x8 flattened a8 to h1 or row 0 to 7)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDDLE_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

/**
 * Returns static board evaluation in centipawns (+ for White, - for Black).
 */
export function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] || 0;
      let positionalVal = 0;
      const sqIndex = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

      switch (piece.type) {
        case 'p':
          positionalVal = PAWN_PST[sqIndex] || 0;
          break;
        case 'n':
          positionalVal = KNIGHT_PST[sqIndex] || 0;
          break;
        case 'b':
          positionalVal = BISHOP_PST[sqIndex] || 0;
          break;
        case 'r':
          positionalVal = ROOK_PST[sqIndex] || 0;
          break;
        case 'q':
          positionalVal = QUEEN_PST[sqIndex] || 0;
          break;
        case 'k':
          positionalVal = KING_MIDDLE_PST[sqIndex] || 0;
          break;
      }

      const totalVal = baseVal + positionalVal;
      if (piece.color === 'w') {
        score += totalVal;
      } else {
        score -= totalVal;
      }
    }
  }

  return score;
}

/**
 * Ultra-fast local move search for offline / fallback scenarios (<15ms).
 */
export function getLocalFastAIMove(chess: Chess, difficulty: AIDifficulty): Move | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isMaximizing = chess.turn() === 'w';

  // 1. NOVICE: Depth 1 + casual move chance
  if (difficulty === 'novice') {
    if (Math.random() < 0.35) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    let bestMoves: Move[] = [];
    let bestVal = isMaximizing ? -Infinity : Infinity;

    for (const move of legalMoves) {
      chess.move(move);
      const val = evaluateBoard(chess);
      chess.undo();

      if (isMaximizing) {
        if (val > bestVal) {
          bestVal = val;
          bestMoves = [move];
        } else if (val === bestVal) {
          bestMoves.push(move);
        }
      } else {
        if (val < bestVal) {
          bestVal = val;
          bestMoves = [move];
        } else if (val === bestVal) {
          bestMoves.push(move);
        }
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legalMoves[0];
  }

  // 2. INTERMEDIATE / ADVANCED / MASTER: Fast 1-2 ply search with move ordering
  legalMoves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0);
    if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0);
    return scoreB - scoreA;
  });

  let bestMove: Move = legalMoves[0];
  let bestVal = isMaximizing ? -Infinity : Infinity;

  for (const move of legalMoves) {
    chess.move(move);
    const val = evaluateBoard(chess);
    chess.undo();

    if (isMaximizing) {
      if (val > bestVal) {
        bestVal = val;
        bestMove = move;
      }
    } else {
      if (val < bestVal) {
        bestVal = val;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

/**
 * High-performance Stockfish 19 engine move fetcher.
 * Queries Stockfish 19 WASM NNUE running on the server for grandmaster-strength, sub-200ms moves.
 * Automatically falls back to fast local search if network is offline.
 */
export async function getAIMoveStockfish(
  chess: Chess,
  difficulty: AIDifficulty
): Promise<{ from: string; to: string; promotion?: string } | null> {
  const fen = chess.fen();

  try {
    const res = await fetch('/api/stockfish/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen, difficulty }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.move) {
        return data.move;
      }
    }
  } catch (err) {
    console.warn('Stockfish server fetch notice, using fast local engine:', err);
  }

  // Fast offline fallback
  const localMove = getLocalFastAIMove(chess, difficulty);
  if (!localMove) return null;
  return {
    from: localMove.from,
    to: localMove.to,
    promotion: localMove.promotion,
  };
}
