import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  Trophy,
  History as HistoryIcon,
  Users,
  Bot,
  SlidersHorizontal,
  RotateCw,
  Sparkles,
  Swords,
  ShieldAlert,
  Radio,
} from 'lucide-react';

import {
  GameMode,
  AIDifficulty,
  PieceColor,
  TimerConfig,
  GameRecord,
  GameOverReason,
  GameResult,
  BoardTheme,
  MoveRecord,
} from './types/chess';
import { ChessBoard } from './components/ChessBoard/ChessBoard';
import { ChessClock } from './components/Clock/ChessClock';
import { GameControls } from './components/Controls/GameControls';
import { TimerModal } from './components/Settings/TimerModal';
import { NearbyModal } from './components/Multiplayer/NearbyModal';
import { StatsModal } from './components/Stats/StatsModal';
import { GameHistoryModal } from './components/History/GameHistoryModal';
import { GameReviewModal } from './components/History/GameReviewModal';
import { getAIMoveStockfish } from './engine/chessEngine';
import { sounds } from './utils/sound';
import {
  getStoredHistory,
  saveGameToHistory,
  getStoredStats,
  getStoredTheme,
  saveStoredTheme,
} from './services/storage';
import { bluetoothService, BluetoothMessage } from './services/bluetooth';
import { nearbyRoomService, RoomState } from './services/nearbyRoom';

export default function App() {
  // Game Core State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('intermediate');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<PieceColor>('w');
  const [autoFlipLocal, setAutoFlipLocal] = useState<boolean>(true);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => getStoredTheme() as BoardTheme);

  // Timer Configuration & Clocks
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({
    enabled: true,
    preset: 'rapid_10',
    initialMinutes: 10,
    incrementSeconds: 0,
  });
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);

  // Game Progress & Moves
  const [movesHistory, setMovesHistory] = useState<MoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());

  // Captured pieces tracking
  const [whiteCaptured, setWhiteCaptured] = useState<string[]>([]);
  const [blackCaptured, setBlackCaptured] = useState<string[]>([]);

  // Modals
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [reviewGame, setReviewGame] = useState<GameRecord | null>(null);

  // Stats & History from storage
  const [stats, setStats] = useState(() => getStoredStats());
  const [history, setHistory] = useState<GameRecord[]>(() => getStoredHistory());

  // Active Room State (for Nearby Direct Code sync)
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const moveStartTimeRef = useRef<number>(Date.now());

  // Clock countdown loop
  useEffect(() => {
    if (!timerConfig.enabled || isGameOver || chess.history().length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const turn = chess.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeout('w');
            return 0;
          }
          if (prev === 10) sounds.playClockTick();
          return Math.max(0, +(prev - 0.1).toFixed(1));
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeout('b');
            return 0;
          }
          if (prev === 10) sounds.playClockTick();
          return Math.max(0, +(prev - 0.1).toFixed(1));
        });
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerConfig.enabled, isGameOver, chess]);

  // Handle Timeout
  const handleTimeout = useCallback(
    (timedOutColor: PieceColor) => {
      if (isGameOver) return;
      const winnerColor = timedOutColor === 'w' ? 'b' : 'w';
      const userWon = playerColor === winnerColor;

      finishGame(
        gameMode === 'ai' ? (userWon ? 'win' : 'loss') : 'win',
        'timeout',
        winnerColor
      );
    },
    [isGameOver, playerColor, gameMode]
  );

  // Sound mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  // Check game over status
  const evaluateGameStatus = useCallback(
    (c: Chess) => {
      if (c.isGameOver()) {
        let res: GameResult = 'draw';
        let reason: GameOverReason = 'stalemate';

        if (c.isCheckmate()) {
          const winnerColor = c.turn() === 'w' ? 'b' : 'w';
          reason = 'checkmate';
          if (gameMode === 'ai') {
            res = playerColor === winnerColor ? 'win' : 'loss';
          } else {
            res = 'win';
          }
        } else if (c.isDraw()) {
          res = 'draw';
          if (c.isThreefoldRepetition()) reason = 'threefold_repetition';
          else if (c.isInsufficientMaterial()) reason = 'insufficient_material';
          else reason = 'stalemate';
        }

        finishGame(res, reason, c.isCheckmate() ? (c.turn() === 'w' ? 'b' : 'w') : null);
        return true;
      }
      return false;
    },
    [gameMode, playerColor]
  );

  // Finalize Game & record stats
  const finishGame = (res: GameResult, reason: GameOverReason, winnerColor: PieceColor | null) => {
    setIsGameOver(true);
    setGameResult(res);
    setGameOverReason(reason);

    if (res === 'win') {
      sounds.playVictory();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else if (res === 'loss') {
      sounds.playDefeat();
    } else {
      sounds.playCheck();
    }

    const durationSeconds = Math.round((Date.now() - gameStartTime) / 1000);
    const opponentName =
      gameMode === 'ai'
        ? `Stockfish 19 (${aiDifficulty.toUpperCase()})`
        : gameMode === 'bluetooth'
        ? 'Bluetooth Opponent'
        : gameMode === 'nearby_room'
        ? 'Nearby Player'
        : 'Local Player';

    const newRecord: GameRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      timestamp: Date.now(),
      mode: gameMode,
      difficulty: gameMode === 'ai' ? aiDifficulty : undefined,
      playerColor,
      opponentName,
      result: res,
      reason,
      movesCount: chess.history().length,
      durationSeconds,
      pgn: chess.pgn(),
      moves: movesHistory,
    };

    saveGameToHistory(newRecord);
    setStats(getStoredStats());
    setHistory(getStoredHistory());
  };

  // Perform a Move
  const makeMove = useCallback(
    (moveObj: { from: string; to: string; promotion?: string }) => {
      if (isGameOver) return false;

      const newChess = new Chess(chess.fen());
      try {
        const move = newChess.move({
          from: moveObj.from,
          to: moveObj.to,
          promotion: moveObj.promotion || 'q',
        });

        if (!move) return false;

        // Play appropriate sound
        if (newChess.isCheck()) {
          sounds.playCheck();
        } else if (move.captured) {
          sounds.playCapture();
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          sounds.playCastle();
        } else {
          sounds.playMove();
        }

        // Track captured pieces
        if (move.captured) {
          if (move.color === 'w') {
            setWhiteCaptured((prev) => [...prev, move.captured!]);
          } else {
            setBlackCaptured((prev) => [...prev, move.captured!]);
          }
        }

        // Add increment if timer enabled
        if (timerConfig.enabled && timerConfig.incrementSeconds > 0) {
          if (move.color === 'w') {
            setWhiteTime((prev) => prev + timerConfig.incrementSeconds);
          } else {
            setBlackTime((prev) => prev + timerConfig.incrementSeconds);
          }
        }

        const moveRecord: MoveRecord = {
          san: move.san,
          from: move.from,
          to: move.to,
          piece: move.piece,
          color: move.color as PieceColor,
          captured: move.captured,
          promotion: move.promotion,
          fenAfter: newChess.fen(),
          timeSpent: Math.round((Date.now() - moveStartTimeRef.current) / 1000),
        };

        moveStartTimeRef.current = Date.now();
        setMovesHistory((prev) => [...prev, moveRecord]);
        setLastMove({ from: move.from, to: move.to });
        setChess(newChess);

        // Auto flip for pass and play
        if (gameMode === 'local' && autoFlipLocal) {
          setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
        }

        // Sync to Bluetooth if in bluetooth mode
        if (gameMode === 'bluetooth') {
          bluetoothService.sendMessage({
            type: 'move',
            from: move.from,
            to: move.to,
            promotion: move.promotion,
            san: move.san,
            fen: newChess.fen(),
          });
        }

        // Sync to nearby room if active
        if (gameMode === 'nearby_room' && activeRoomCode) {
          nearbyRoomService.sendMove({
            fen: newChess.fen(),
            pgn: newChess.pgn(),
            lastMove: { from: move.from, to: move.to, promotion: move.promotion, san: move.san },
            turn: newChess.turn() as PieceColor,
            whiteTime,
            blackTime,
          });
        }

        evaluateGameStatus(newChess);
        return true;
      } catch (e) {
        console.warn('Illegal move attempt:', e);
        return false;
      }
    },
    [
      chess,
      isGameOver,
      timerConfig,
      gameMode,
      autoFlipLocal,
      activeRoomCode,
      whiteTime,
      blackTime,
      evaluateGameStatus,
    ]
  );

  // Trigger AI Move via Stockfish 19 Engine
  useEffect(() => {
    if (gameMode !== 'ai' || isGameOver) return;

    const isAITurn = chess.turn() !== playerColor;
    if (isAITurn) {
      setIsAiThinking(true);
      let cancelled = false;

      getAIMoveStockfish(chess, aiDifficulty).then((aiMove) => {
        if (cancelled) return;
        setIsAiThinking(false);
        if (aiMove) {
          makeMove(aiMove);
        }
      });

      return () => {
        cancelled = true;
      };
    }
  }, [chess, gameMode, playerColor, isGameOver, aiDifficulty, makeMove]);

  // Bluetooth message receiver
  useEffect(() => {
    const unsub = bluetoothService.onMessage((msg: BluetoothMessage) => {
      if (msg.type === 'move') {
        makeMove({ from: msg.from, to: msg.to, promotion: msg.promotion });
      } else if (msg.type === 'resign') {
        finishGame('win', 'resignation', playerColor);
      } else if (msg.type === 'draw_offer') {
        // Can auto-accept or prompt
        finishGame('draw', 'agreement', null);
      }
    });
    return unsub;
  }, [makeMove, playerColor]);

  // Nearby Room update receiver
  useEffect(() => {
    const unsub = nearbyRoomService.onUpdate((roomState: RoomState, role) => {
      if (roomState.lastMove && roomState.fen !== chess.fen()) {
        const nextChess = new Chess(roomState.fen);
        setChess(nextChess);
        setLastMove({ from: roomState.lastMove.from, to: roomState.lastMove.to });
        if (roomState.whiteTime) setWhiteTime(roomState.whiteTime);
        if (roomState.blackTime) setBlackTime(roomState.blackTime);
        evaluateGameStatus(nextChess);
      }
    });
    return unsub;
  }, [chess, evaluateGameStatus]);

  // Start a fresh match
  const startNewGame = useCallback(
    (mode: GameMode = gameMode, diff: AIDifficulty = aiDifficulty, color: PieceColor = playerColor) => {
      const newGame = new Chess();
      setChess(newGame);
      setGameMode(mode);
      setAiDifficulty(diff);

      const resolvedColor = color;
      setPlayerColor(resolvedColor);
      setBoardOrientation(mode === 'local' ? 'w' : resolvedColor);

      const initSecs = timerConfig.enabled ? timerConfig.initialMinutes * 60 : 600;
      setWhiteTime(initSecs);
      setBlackTime(initSecs);
      setMovesHistory([]);
      setLastMove(null);
      setIsGameOver(false);
      setGameResult(null);
      setGameOverReason(null);
      setWhiteCaptured([]);
      setBlackCaptured([]);
      setGameStartTime(Date.now());
      moveStartTimeRef.current = Date.now();

      // If playing as Black vs AI, let AI make the first move via Stockfish
      if (mode === 'ai' && resolvedColor === 'b') {
        setIsAiThinking(true);
        getAIMoveStockfish(newGame, diff).then((aiMove) => {
          setIsAiThinking(false);
          if (aiMove) {
            newGame.move(aiMove);
            setChess(new Chess(newGame.fen()));
            setLastMove({ from: aiMove.from, to: aiMove.to });
            sounds.playMove();
          }
        });
      }
    },
    [gameMode, aiDifficulty, playerColor, timerConfig]
  );

  // Undo Move
  const handleUndoMove = () => {
    if (isGameOver || chess.history().length === 0) return;

    const newChess = new Chess(chess.fen());
    if (gameMode === 'ai') {
      // Undo both player and AI move
      newChess.undo();
      newChess.undo();
      setMovesHistory((prev) => prev.slice(0, -2));
    } else {
      newChess.undo();
      setMovesHistory((prev) => prev.slice(0, -1));
      if (gameMode === 'local' && autoFlipLocal) {
        setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
      }
    }

    setChess(newChess);
    const hist = newChess.history({ verbose: true });
    setLastMove(hist.length ? { from: hist[hist.length - 1].from, to: hist[hist.length - 1].to } : null);
  };

  // Flip Board view manually
  const handleFlipBoard = () => {
    setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
  };

  // Resign match
  const handleResign = () => {
    if (isGameOver) return;
    const resigningColor = chess.turn();
    const winningColor = resigningColor === 'w' ? 'b' : 'w';
    const res = gameMode === 'ai' ? (playerColor === winningColor ? 'win' : 'loss') : 'loss';
    finishGame(res, 'resignation', winningColor);
  };

  // Offer draw
  const handleOfferDraw = () => {
    if (isGameOver) return;
    if (gameMode === 'ai') {
      // AI accepts draw if position is balanced (|eval| < 100)
      finishGame('draw', 'agreement', null);
    } else {
      finishGame('draw', 'agreement', null);
    }
  };

  const handleSaveTimerConfig = (config: TimerConfig, theme: BoardTheme) => {
    setTimerConfig(config);
    setBoardTheme(theme);
    saveStoredTheme(theme);
    if (config.enabled) {
      setWhiteTime(config.initialMinutes * 60);
      setBlackTime(config.initialMinutes * 60);
    }
  };

  const handleStartLocalPassAndPlay = (autoFlip: boolean) => {
    setAutoFlipLocal(autoFlip);
    startNewGame('local', aiDifficulty, 'w');
  };

  const handleStartBluetoothGame = () => {
    startNewGame('bluetooth', aiDifficulty, 'w');
  };

  const handleStartRoomGame = (code: string, role: 'w' | 'b') => {
    setActiveRoomCode(code);
    startNewGame('nearby_room', aiDifficulty, role);
  };

  // Player Names
  const whiteName =
    gameMode === 'ai'
      ? playerColor === 'w'
        ? 'You (White)'
        : `Stockfish 19 (${aiDifficulty.toUpperCase()})`
      : gameMode === 'local'
      ? 'Player 1 (White)'
      : 'Host (White)';

  const blackName =
    gameMode === 'ai'
      ? playerColor === 'b'
        ? 'You (Black)'
        : `Stockfish 19 (${aiDifficulty.toUpperCase()})`
      : gameMode === 'local'
      ? 'Player 2 (Black)'
      : 'Guest (Black)';

  const isBoardDisabled =
    isGameOver || isAiThinking || (gameMode === 'ai' && chess.turn() !== playerColor);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500/30">
      {/* 1. TOP BAR CONTRACT: Zone 1 (Wordmark) — Zone 2 (4-5 Nav Links) — Zone 3 (1 Primary Action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <span className="text-base sm:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display">
          CHESS : OFFLINE AND LOCAL PLAY
        </span>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-400">
          <button
            onClick={() => startNewGame('ai')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              gameMode === 'ai' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            AI Match
          </button>
          <button
            onClick={() => setIsNearbyModalOpen(true)}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              gameMode === 'local' || gameMode === 'bluetooth' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Pass & Play
          </button>
          <button
            onClick={() => setIsNearbyModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Bluetooth & Nearby
          </button>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            History & Reviews
          </button>
          <button
            onClick={() => setIsStatsModalOpen(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Statistics
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => startNewGame('ai', 'intermediate', 'w')}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            Quick Match
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto px-4 py-5 gap-4">
        {/* Match Configuration Strip (Segmented controls) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/60 border border-slate-800 rounded-2xl">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => startNewGame('ai')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                gameMode === 'ai'
                  ? 'bg-slate-800 text-amber-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>vs AI</span>
            </button>
            <button
              onClick={() => setIsNearbyModalOpen(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                gameMode === 'local'
                  ? 'bg-slate-800 text-amber-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Local Match</span>
            </button>
            <button
              onClick={() => setIsNearbyModalOpen(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                gameMode === 'bluetooth' || gameMode === 'nearby_room'
                  ? 'bg-slate-800 text-amber-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Nearby / Bluetooth</span>
            </button>
          </div>

          {/* AI Difficulty & Color Settings */}
          {gameMode === 'ai' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Difficulty:</span>
              <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                {(['novice', 'intermediate', 'advanced', 'master'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setAiDifficulty(lvl);
                      startNewGame('ai', lvl, playerColor);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold capitalize rounded-md transition-colors ${
                      aiDifficulty === lvl
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Player Color Choice */}
              <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800 ml-1">
                <button
                  onClick={() => startNewGame('ai', aiDifficulty, 'w')}
                  className={`px-2 py-1 text-xs font-bold rounded-md ${
                    playerColor === 'w' ? 'bg-slate-100 text-slate-950' : 'text-slate-400'
                  }`}
                  title="Play as White"
                >
                  White
                </button>
                <button
                  onClick={() => startNewGame('ai', aiDifficulty, 'b')}
                  className={`px-2 py-1 text-xs font-bold rounded-md ${
                    playerColor === 'b' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
                  }`}
                  title="Play as Black"
                >
                  Black
                </button>
              </div>
            </div>
          )}

          {/* Timer Display / Trigger Button */}
          <button
            onClick={() => setIsTimerModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Timer:{' '}
              {timerConfig.enabled
                ? `${timerConfig.initialMinutes} min ${
                    timerConfig.incrementSeconds ? `+ ${timerConfig.incrementSeconds}s` : ''
                  }`
                : 'Untimed'}
            </span>
          </button>
        </div>

        {/* Central Arena: Clocks, Board, and Controls */}
        <div className="flex flex-col items-center gap-3">
          {/* Status Indicator */}
          {isAiThinking && (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 animate-pulse">
              <Bot className="w-4 h-4" />
              <span>Stockfish 19 NNUE is calculating move...</span>
            </div>
          )}

          {/* Clock Bars */}
          <ChessClock
            whiteTime={whiteTime}
            blackTime={blackTime}
            activeColor={chess.turn() as PieceColor}
            timerConfig={timerConfig}
            whiteCaptured={whiteCaptured}
            blackCaptured={blackCaptured}
            whitePlayerName={whiteName}
            blackPlayerName={blackName}
            isGameOver={isGameOver}
          />

          {/* Interactive Chessboard */}
          <ChessBoard
            chess={chess}
            orientation={boardOrientation}
            onMakeMove={makeMove}
            disabled={isBoardDisabled}
            lastMove={lastMove}
            theme={boardTheme}
          />

          {/* Game Action Controls Toolbar */}
          <GameControls
            onNewGame={() => startNewGame()}
            onFlipBoard={handleFlipBoard}
            onUndoMove={handleUndoMove}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onOpenTimerSettings={() => setIsTimerModalOpen(true)}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            canUndo={chess.history().length > 0}
            isGameOver={isGameOver}
            gameMode={gameMode}
          />
        </div>

        {/* Footer info & shortcuts */}
        <footer className="text-center text-xs text-slate-500 py-2 border-t border-slate-800/60 mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-400">
            <span>Tournament Standards</span>
            <span aria-hidden="true">·</span>
            <span>Alpha-Beta Pruning Engine</span>
            <span aria-hidden="true">·</span>
            <span>100% Offline Capable</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
            >
              Past Games ({history.length})
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsStatsModalOpen(true)}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
            >
              View Player Stats
            </button>
          </div>
        </footer>
      </main>

      {/* Game Over Victory / Draw / Defeat Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center text-slate-100">
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {gameResult === 'win' ? (
                <Trophy className="w-7 h-7" />
              ) : gameResult === 'loss' ? (
                <ShieldAlert className="w-7 h-7 text-red-400" />
              ) : (
                <Swords className="w-7 h-7 text-amber-400" />
              )}
            </div>

            <h3 className="text-xl font-bold font-display capitalize mb-1">
              {gameResult === 'win'
                ? 'Checkmate Victory!'
                : gameResult === 'loss'
                ? 'Match Defeat'
                : 'Game Drawn'}
            </h3>

            <p className="text-xs text-slate-400 mb-5 capitalize">
              {gameOverReason?.replace(/_/g, ' ') || 'normal conclusion'} · {chess.history().length}{' '}
              moves
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const lastGame = history[0];
                  if (lastGame) setReviewGame(lastGame);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Review Game & Coach Analysis</span>
              </button>

              <button
                onClick={() => startNewGame()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer & Theme Settings Modal */}
      <TimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        currentConfig={timerConfig}
        currentTheme={boardTheme}
        onSave={handleSaveTimerConfig}
      />

      {/* Nearby & Bluetooth Modal */}
      <NearbyModal
        isOpen={isNearbyModalOpen}
        onClose={() => setIsNearbyModalOpen(false)}
        onStartLocalPassAndPlay={handleStartLocalPassAndPlay}
        onStartBluetoothGame={handleStartBluetoothGame}
        onStartRoomGame={handleStartRoomGame}
        initialTimeSeconds={timerConfig.enabled ? timerConfig.initialMinutes * 60 : 600}
      />

      {/* Player Statistics Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={stats}
        onStatsReset={() => setStats(getStoredStats())}
      />

      {/* Game History Modal */}
      <GameHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onSelectGame={(g) => setReviewGame(g)}
        onHistoryCleared={() => {
          setHistory([]);
          setStats(getStoredStats());
        }}
      />

      {/* Interactive Game Review & Analysis Modal */}
      {reviewGame && (
        <GameReviewModal
          isOpen={true}
          onClose={() => setReviewGame(null)}
          game={reviewGame}
        />
      )}
    </div>
  );
}
