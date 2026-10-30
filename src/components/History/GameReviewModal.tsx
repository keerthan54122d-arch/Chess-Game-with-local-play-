import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Copy,
  Download,
  Check,
  Award,
  AlertTriangle,
  Lightbulb,
  BrainCircuit,
} from 'lucide-react';
import { GameRecord, MoveRecord, GeminiCoachAnalysis } from '../../types/chess';
import { PieceIcon } from '../ChessBoard/PieceIcons';
import { analyzeGameMoves, fetchGeminiGameAnalysis } from '../../services/analysis';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameRecord;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  game,
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'moves' | 'coach' | 'pgn'>('moves');
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [coachAnalysis, setCoachAnalysis] = useState<GeminiCoachAnalysis | null>(game.aiAnalysis || null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

  // Compute move evaluations and accuracies
  const analysisData = useMemo(() => {
    return analyzeGameMoves(game.moves || []);
  }, [game.moves]);

  // Construct board state at current move index
  const currentChess = useMemo(() => {
    const c = new Chess();
    if (currentMoveIndex >= 0 && game.moves) {
      for (let i = 0; i <= currentMoveIndex; i++) {
        const m = game.moves[i];
        try {
          c.move({ from: m.from, to: m.to, promotion: m.promotion });
        } catch {
          // ignore
        }
      }
    }
    return c;
  }, [currentMoveIndex, game.moves]);

  // Auto-play interval
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentMoveIndex((prev) => {
          if (prev >= (game.moves?.length || 0) - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isPlaying, game.moves]);

  // Fetch coach analysis if not already loaded
  useEffect(() => {
    if (!coachAnalysis && isOpen) {
      setIsLoadingCoach(true);
      fetchGeminiGameAnalysis(game).then((res) => {
        setCoachAnalysis(res);
        setIsLoadingCoach(false);
      });
    }
  }, [isOpen, game, coachAnalysis]);

  if (!isOpen) return null;

  const currentMove: MoveRecord | undefined =
    currentMoveIndex >= 0 ? analysisData.analyzedMoves[currentMoveIndex] : undefined;

  const board = currentChess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // Eval bar height percentage (+1000 cp = 100% white, -1000 cp = 0% white)
  const evalScore = currentMove?.evalScore || 0;
  const clampedEval = Math.max(-1000, Math.min(1000, evalScore));
  const whitePercent = 50 + (clampedEval / 1000) * 45;

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(game.pgn);
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleDownloadPgn = () => {
    const blob = new Blob([game.pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_game_${game.id}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadGeminiAnalysis = async () => {
    setIsLoadingCoach(true);
    const res = await fetchGeminiGameAnalysis(game);
    setCoachAnalysis(res);
    setIsLoadingCoach(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Match Analysis: vs {game.opponentName}
              </h3>
              <div className="text-xs text-slate-400">
                {game.date} · {game.movesCount} moves · Result:{' '}
                <span className="font-semibold uppercase text-amber-400">{game.result}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split: Board on Left, Review Tabs on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-4 flex-1 overflow-y-auto">
          {/* Left Column: Replay Board & Scrubber (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Board Container with Side Eval Bar */}
            <div className="flex gap-2 w-full max-w-[420px] aspect-square">
              {/* Vertical Advantage Eval Bar */}
              <div className="w-3 rounded-md bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-end shrink-0 relative">
                <div
                  className="bg-slate-200 transition-all duration-300 w-full"
                  style={{ height: `${whitePercent}%` }}
                />
              </div>

              {/* 8x8 Board */}
              <div className="flex-1 grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-lg">
                {ranks.map((r, rowIdx) =>
                  files.map((f, colIdx) => {
                    const sq = `${f}${r}`;
                    const piece = board[rowIdx][colIdx];
                    const isLight = (rowIdx + colIdx) % 2 === 0;
                    const isLastMove =
                      currentMove && (currentMove.from === sq || currentMove.to === sq);

                    return (
                      <div
                        key={sq}
                        className={`relative flex items-center justify-center ${
                          isLastMove
                            ? isLight
                              ? 'bg-amber-200/90'
                              : 'bg-amber-400/60'
                            : isLight
                            ? 'bg-[#e8d0a9]'
                            : 'bg-[#b07b46]'
                        }`}
                      >
                        {colIdx === 0 && (
                          <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-stone-700/70 pointer-events-none">
                            {r}
                          </span>
                        )}
                        {rowIdx === 7 && (
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-semibold text-stone-700/70 pointer-events-none">
                            {f}
                          </span>
                        )}
                        {piece && (
                          <div className="w-[84%] h-[84%]">
                            <PieceIcon type={piece.type} color={piece.color} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Scrubber Controls */}
            <div className="flex items-center justify-between w-full max-w-[420px] mt-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMoveIndex(-1)}
                  disabled={currentMoveIndex === -1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                  title="First position"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMoveIndex((prev) => Math.max(-1, prev - 1))}
                  disabled={currentMoveIndex === -1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                  title="Previous move"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800"
                  title={isPlaying ? 'Pause' : 'Auto Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() =>
                    setCurrentMoveIndex((prev) =>
                      Math.min((game.moves?.length || 0) - 1, prev + 1)
                    )
                  }
                  disabled={currentMoveIndex >= (game.moves?.length || 0) - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                  title="Next move"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMoveIndex((game.moves?.length || 0) - 1)}
                  disabled={currentMoveIndex >= (game.moves?.length || 0) - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                  title="Final position"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              {/* Move counter & evaluation */}
              <div className="text-right text-xs">
                <span className="font-mono text-slate-300">
                  {currentMoveIndex === -1
                    ? 'Start'
                    : `Move ${Math.floor(currentMoveIndex / 2) + 1}${
                        currentMoveIndex % 2 === 0 ? ' (White)' : ' (Black)'
                      }`}
                </span>
                {currentMove && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                      currentMove.evalClassification === 'best'
                        ? 'bg-emerald-950 text-emerald-400'
                        : currentMove.evalClassification === 'blunder'
                        ? 'bg-red-950 text-red-400'
                        : currentMove.evalClassification === 'mistake'
                        ? 'bg-orange-950 text-orange-400'
                        : currentMove.evalClassification === 'inaccuracy'
                        ? 'bg-yellow-950 text-yellow-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {currentMove.evalClassification} ({currentMove.san})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Tabs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-950/80 rounded-xl border border-slate-800 p-3">
            {/* Tab Buttons */}
            <div className="flex p-1 bg-slate-900 rounded-lg mb-3 border border-slate-800">
              <button
                onClick={() => setActiveTab('moves')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'moves'
                    ? 'bg-slate-800 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Moves List
              </button>
              <button
                onClick={() => setActiveTab('coach')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'coach'
                    ? 'bg-slate-800 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Coach</span>
              </button>
              <button
                onClick={() => setActiveTab('pgn')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'pgn'
                    ? 'bg-slate-800 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PGN
              </button>
            </div>

            {/* Tab 1: Moves List with Evaluations */}
            {activeTab === 'moves' && (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                {/* Accuracy Summary header */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 mb-2">
                  <div>
                    <span className="text-[11px] text-slate-400">White Accuracy:</span>
                    <span className="ml-1.5 font-bold text-slate-200">
                      {analysisData.whiteAccuracy}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Black Accuracy:</span>
                    <span className="ml-1.5 font-bold text-slate-200">
                      {analysisData.blackAccuracy}%
                    </span>
                  </div>
                </div>

                {/* Move table */}
                <div className="space-y-0.5">
                  {analysisData.analyzedMoves.reduce<Array<{ whiteMove?: MoveRecord; blackMove?: MoveRecord; moveNum: number }>>(
                    (acc, move, idx) => {
                      if (idx % 2 === 0) {
                        acc.push({ whiteMove: move, moveNum: Math.floor(idx / 2) + 1 });
                      } else {
                        acc[acc.length - 1].blackMove = move;
                      }
                      return acc;
                    },
                    []
                  ).map((turn, tIdx) => {
                    const whiteIdx = tIdx * 2;
                    const blackIdx = tIdx * 2 + 1;
                    const isWhiteActive = currentMoveIndex === whiteIdx;
                    const isBlackActive = currentMoveIndex === blackIdx;

                    return (
                      <div
                        key={turn.moveNum}
                        className="flex items-center py-1 px-2 rounded-md hover:bg-slate-900/60"
                      >
                        <span className="w-8 text-slate-500">{turn.moveNum}.</span>

                        {/* White move */}
                        <button
                          onClick={() => setCurrentMoveIndex(whiteIdx)}
                          className={`flex-1 text-left px-2 py-0.5 rounded transition-colors flex items-center justify-between ${
                            isWhiteActive
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span>{turn.whiteMove?.san}</span>
                          {turn.whiteMove?.evalClassification && turn.whiteMove.evalClassification !== 'good' && (
                            <span
                              className={`text-[9px] px-1 rounded-sm uppercase ${
                                turn.whiteMove.evalClassification === 'blunder'
                                  ? 'bg-red-950 text-red-400'
                                  : turn.whiteMove.evalClassification === 'mistake'
                                  ? 'bg-orange-950 text-orange-400'
                                  : turn.whiteMove.evalClassification === 'best'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-yellow-950 text-yellow-400'
                              }`}
                            >
                              {turn.whiteMove.evalClassification[0]}
                            </span>
                          )}
                        </button>

                        {/* Black move */}
                        {turn.blackMove && (
                          <button
                            onClick={() => setCurrentMoveIndex(blackIdx)}
                            className={`flex-1 text-left px-2 py-0.5 rounded transition-colors flex items-center justify-between ml-1 ${
                              isBlackActive
                                ? 'bg-amber-500/20 text-amber-300 font-bold'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span>{turn.blackMove.san}</span>
                            {turn.blackMove.evalClassification && turn.blackMove.evalClassification !== 'good' && (
                              <span
                                className={`text-[9px] px-1 rounded-sm uppercase ${
                                  turn.blackMove.evalClassification === 'blunder'
                                    ? 'bg-red-950 text-red-400'
                                    : turn.blackMove.evalClassification === 'mistake'
                                    ? 'bg-orange-950 text-orange-400'
                                    : turn.blackMove.evalClassification === 'best'
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : 'bg-yellow-950 text-yellow-400'
                                }`}
                              >
                                {turn.blackMove.evalClassification[0]}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: AI Coach Review & Analysis */}
            {activeTab === 'coach' && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {isLoadingCoach ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <BrainCircuit className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                    <p>Grandmaster Coach is evaluating game subtleties...</p>
                  </div>
                ) : coachAnalysis ? (
                  <>
                    {/* Coach Portrait Banner */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/40 shrink-0">
                        <img
                          src="/src/assets/images/chess_ai_grandmaster_1793393723333.jpg"
                          alt="AI Grandmaster Coach"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                          {coachAnalysis.openingName}
                        </div>
                        <div className="text-sm font-bold text-slate-100">
                          {coachAnalysis.playerAccuracy}% Overall Accuracy
                        </div>
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-slate-200 italic">
                      "{coachAnalysis.headline}"
                    </div>

                    {/* Turning Point */}
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Crucial Turning Point</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        {coachAnalysis.keyTurningPoint}
                      </p>
                    </div>

                    {/* Full Critique */}
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-300">Coach Critique</div>
                      <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 whitespace-pre-line">
                        {coachAnalysis.coachCritique}
                      </p>
                    </div>

                    {/* Master Tips */}
                    {coachAnalysis.topAdvice?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Key Takeaways for Your Next Match</span>
                        </div>
                        <div className="space-y-1">
                          {coachAnalysis.topAdvice.map((tip, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-2"
                            >
                              <span className="text-amber-400 font-bold font-mono">0{i + 1}.</span>
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleLoadGeminiAnalysis}
                      className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Refresh Coach Commentary</span>
                    </button>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <button
                      onClick={handleLoadGeminiAnalysis}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Generate Grandmaster Game Review
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: PGN Export & Copy */}
            {activeTab === 'pgn' && (
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <textarea
                  readOnly
                  value={game.pgn}
                  rows={10}
                  className="w-full flex-1 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 resize-none focus:outline-hidden"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyPgn}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedPgn ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy PGN</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPgn}
                    className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .pgn</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
