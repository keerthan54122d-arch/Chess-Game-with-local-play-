import React, { useState } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { PieceIcon } from './PieceIcons';
import { PieceColor, BoardTheme } from '../../types/chess';

interface ChessBoardProps {
  chess: Chess;
  orientation: PieceColor;
  onMakeMove: (move: { from: string; to: string; promotion?: string }) => void;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  theme?: BoardTheme;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation,
  onMakeMove,
  disabled = false,
  lastMove = null,
  theme = 'tournament_wood',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const lastActionTimeRef = React.useRef<number>(0);

  const isWhitePerspective = orientation === 'w';

  // Compute check square if any king is in check
  let checkSquare: Square | null = null;
  if (chess.isCheck()) {
    const turn = chess.turn();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const f of files) {
      for (const r of ranks) {
        const sq = `${f}${r}` as Square;
        const p = chess.get(sq);
        if (p && p.type === 'k' && p.color === turn) {
          checkSquare = sq;
          break;
        }
      }
      if (checkSquare) break;
    }
  }

  // Get all legal moves for current position
  const allLegalMoves = chess.moves({ verbose: true });

  // Get legal destination targets for the selected piece
  const legalTargetMap = new Map<string, Move>();
  if (selectedSquare) {
    allLegalMoves
      .filter((m) => m.from === selectedSquare)
      .forEach((m) => {
        legalTargetMap.set(m.to, m);
      });
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // Indices order based on perspective
  const rankList = isWhitePerspective ? ranks : [...ranks].reverse();
  const fileList = isWhitePerspective ? files : [...files].reverse();

  const handleSquareInteraction = (sq: Square) => {
    // Debounce to prevent duplicate fires between pointerdown and click
    const now = Date.now();
    if (now - lastActionTimeRef.current < 80) return;
    lastActionTimeRef.current = now;

    if (disabled) return;
    if (pendingPromotion) return;

    // 1. If a valid legal target was tapped, execute the move!
    if (selectedSquare && legalTargetMap.has(sq)) {
      const piece = chess.get(selectedSquare);
      const isPawn = piece?.type === 'p';
      const isPromotionRank = sq.endsWith('8') || sq.endsWith('1');

      if (isPawn && isPromotionRank) {
        setPendingPromotion({ from: selectedSquare, to: sq });
        return;
      }

      onMakeMove({ from: selectedSquare, to: sq, promotion: 'q' });
      setSelectedSquare(null);
      return;
    }

    // 2. Otherwise check if the tapped square has a piece belonging to current turn
    const clickedPiece = chess.get(sq);
    if (clickedPiece && clickedPiece.color === chess.turn()) {
      // Toggle selection or select new piece
      setSelectedSquare((prev) => (prev === sq ? null : sq));
    } else {
      // Clicked on empty non-target square or opponent piece
      setSelectedSquare(null);
    }
  };

  const handlePromotionSelect = (promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    onMakeMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promoPiece,
    });
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Color schemes for board squares
  const getSquareColorClass = (isLight: boolean, isLastMove: boolean, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-amber-400/80 ring-3 ring-inset ring-amber-500 shadow-inner';
    }
    if (isLastMove) {
      return isLight ? 'bg-amber-200/90' : 'bg-amber-300/80';
    }

    switch (theme) {
      case 'emerald_classic':
        return isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]';
      case 'midnight_slate':
        return isLight ? 'bg-slate-200' : 'bg-slate-600';
      case 'carbon_dark':
        return isLight ? 'bg-zinc-300' : 'bg-zinc-700';
      case 'tournament_wood':
      default:
        // Rich Tournament Maple & Dark Walnut
        return isLight ? 'bg-[#e8d0a9]' : 'bg-[#b07b46]';
    }
  };

  return (
    <div className="relative select-none aspect-square w-full max-w-[540px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-900 touch-none">
      {/* 8x8 Board Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full touch-none">
        {rankList.map((rank, rowIdx) => {
          return fileList.map((file, colIdx) => {
            const sq = `${file}${rank}` as Square;
            const piece = chess.get(sq);
            const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0;
            const isSelected = selectedSquare === sq;
            const isLastMove = lastMove?.from === sq || lastMove?.to === sq;
            const isTarget = legalTargetMap.has(sq);
            const isTargetCapture = isTarget && (piece !== null || (legalTargetMap.get(sq)?.flags.includes('e') ?? false));
            const isCheckSquare = checkSquare === sq;

            return (
              <button
                type="button"
                key={sq}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSquareInteraction(sq);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSquareInteraction(sq);
                }}
                className={`relative flex items-center justify-center p-0 m-0 border-0 outline-hidden transition-colors duration-75 active:opacity-90 ${
                  disabled ? 'cursor-default' : 'cursor-pointer'
                } ${getSquareColorClass(isLight, isLastMove, isSelected)}`}
                aria-label={`Square ${sq} ${piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : 'empty'}`}
              >
                {/* Coordinates */}
                {/* Rank number on leftmost column */}
                {colIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-semibold leading-none pointer-events-none select-none ${
                      isLight ? 'text-stone-700/75' : 'text-stone-200/85'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {/* File letter on bottommost row */}
                {rowIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-semibold leading-none pointer-events-none select-none ${
                      isLight ? 'text-stone-700/75' : 'text-stone-200/85'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Check warning aura on King in danger */}
                {isCheckSquare && (
                  <div className="absolute inset-0 bg-red-500/50 animate-pulse pointer-events-none ring-3 ring-red-600 rounded-xs" />
                )}

                {/* Piece Graphic */}
                {piece && (
                  <div className="w-[84%] h-[84%] flex items-center justify-center pointer-events-none select-none transition-transform">
                    <PieceIcon type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal destination indicator */}
                {isTarget && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    {isTargetCapture ? (
                      <div className="w-[85%] h-[85%] rounded-full ring-4 ring-black/35" />
                    ) : (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black/30 shadow-xs" />
                    )}
                  </div>
                )}
              </button>
            );
          });
        })}
      </div>

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 text-white p-5 rounded-2xl shadow-2xl max-w-xs w-full text-center">
            <h4 className="text-base font-bold mb-1 text-slate-100">Promote Pawn</h4>
            <p className="text-xs text-slate-400 mb-4">Choose your new piece</p>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((pType) => {
                const label = pType === 'q' ? 'Queen' : pType === 'r' ? 'Rook' : pType === 'b' ? 'Bishop' : 'Knight';
                return (
                  <button
                    key={pType}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handlePromotionSelect(pType);
                    }}
                    onClick={() => handlePromotionSelect(pType)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 active:bg-amber-500/40 border border-slate-700 hover:border-amber-500 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center pointer-events-none">
                      <PieceIcon type={pType} color={chess.turn()} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 mt-1">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
