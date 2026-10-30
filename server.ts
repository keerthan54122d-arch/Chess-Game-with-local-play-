import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

// Initialize Gemini API if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory room store for nearby local sync (4-digit pin or room code)
interface NearbyRoom {
  code: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  fen: string;
  pgn: string;
  lastMove: { from: string; to: string; promotion?: string; san: string } | null;
  turn: 'w' | 'b';
  whiteTime: number;
  blackTime: number;
  status: 'waiting' | 'active' | 'resigned' | 'checkmate' | 'draw';
  winner: 'w' | 'b' | 'draw' | null;
  lastUpdatedAt: number;
}

const nearbyRooms = new Map<string, NearbyRoom>();

// Clean up inactive rooms older than 3 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of nearbyRooms.entries()) {
    if (now - room.lastUpdatedAt > 3 * 60 * 60 * 1000) {
      nearbyRooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGemini: !!geminiApiKey,
    activeNearbyRooms: nearbyRooms.size,
  });
});

// Initialize Stockfish 19 WASM Engine
let stockfishInstance: any = null;
try {
  const pathToBin = path.resolve(process.cwd(), 'node_modules/stockfish/bin');
  const StockfishFactory = require(path.join(pathToBin, 'stockfish-19-lite-single.js'));
  stockfishInstance = StockfishFactory({
    locateFile: (file: string) => path.join(pathToBin, file),
  });
  stockfishInstance.processCommand('uci');
  console.log('Stockfish 19 WASM NNUE engine initialized successfully');
} catch (err) {
  console.warn('Notice: Stockfish engine module initialization:', err);
}

// Engine execution queue for serialized requests
let isEngineBusy = false;
const engineQueue: Array<() => Promise<void>> = [];

function pumpEngineQueue() {
  if (isEngineBusy || engineQueue.length === 0) return;
  isEngineBusy = true;
  const nextTask = engineQueue.shift()!;
  nextTask().finally(() => {
    isEngineBusy = false;
    pumpEngineQueue();
  });
}

function queryStockfish(fen: string, skillLevel: number, movetimeMs: number): Promise<string> {
  return new Promise((resolve) => {
    engineQueue.push(async () => {
      if (!stockfishInstance) {
        resolve('');
        return;
      }
      return new Promise<void>((taskDone) => {
        let finished = false;
        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            taskDone();
            resolve('');
          }
        }, movetimeMs + 900);

        stockfishInstance.listener = (line: string) => {
          if (line.startsWith('bestmove') && !finished) {
            finished = true;
            clearTimeout(timer);
            const parts = line.split(' ');
            const bestMove = parts[1] || '';
            taskDone();
            resolve(bestMove);
          }
        };

        try {
          stockfishInstance.processCommand(`setoption name Skill Level value ${skillLevel}`);
          stockfishInstance.processCommand(`position fen ${fen}`);
          stockfishInstance.processCommand(`go movetime ${movetimeMs}`);
        } catch (e) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            taskDone();
            resolve('');
          }
        }
      });
    });
    pumpEngineQueue();
  });
}

// Stockfish 19 Move Endpoint
app.post('/api/stockfish/move', async (req: Request, res: Response) => {
  try {
    const { fen, difficulty = 'intermediate' } = req.body;
    if (!fen) {
      return res.status(400).json({ success: false, error: 'FEN string required' });
    }

    let skill = 6;
    let movetime = 120;
    if (difficulty === 'novice') {
      skill = 0; // Novice: Elo ~800
      movetime = 70;
    } else if (difficulty === 'intermediate') {
      skill = 6; // Intermediate: Elo ~1400
      movetime = 120;
    } else if (difficulty === 'advanced') {
      skill = 13; // Advanced: Elo ~1900
      movetime = 200;
    } else if (difficulty === 'master') {
      skill = 20; // Master: Grandmaster level Elo 3000+
      movetime = 300;
    }

    const uci = await queryStockfish(fen, skill, movetime);
    if (!uci || uci === '(none)') {
      return res.json({ success: false, fallback: true });
    }

    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;

    return res.json({
      success: true,
      engine: 'Stockfish 19 NNUE',
      uci,
      move: { from, to, promotion },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Engine error' });
  }
});

// Gemini AI Game Analysis & Coaching
app.post('/api/analyze-game', async (req: Request, res: Response) => {
  try {
    const { pgn, result, playerColor, difficulty, moves } = req.body;

    if (!ai) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'No GEMINI_API_KEY found, using local tactical analysis.',
      });
    }

    const prompt = `You are a FIDE Grandmaster and friendly chess coach. Analyze this chess game played by the user.
Game details:
- User Color: ${playerColor || 'white'}
- Result: ${result || 'unknown'}
- Opponent / Setting: ${difficulty || 'AI match'}
- Move history (PGN format):
${pgn || '1. e4 e5'}

Please provide a concise, educational, and inspiring game breakdown in JSON with this exact schema:
{
  "openingName": "e.g., Ruy Lopez: Morphy Defense or Queen's Gambit Declined",
  "playerAccuracy": 85, // estimated user accuracy from 50 to 99
  "headline": "A punchy 1-sentence summary of the game narrative",
  "keyTurningPoint": "Description of the critical move or blunder where the game swung",
  "coachCritique": "2-3 paragraphs of encouraging, clear positional analysis explaining why moves worked or where tactical oversights happened",
  "topAdvice": [
    "Tip 1 for their next match",
    "Tip 2 for their next match",
    "Tip 3 for their next match"
  ]
}
Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let analysisData;
    try {
      analysisData = JSON.parse(text);
    } catch {
      analysisData = {
        openingName: 'Standard Chess Opening',
        playerAccuracy: 80,
        headline: 'Dynamic and tactical contest with decisive tactical play.',
        keyTurningPoint: 'Crucial transition in the middle game around move 15.',
        coachCritique: text,
        topAdvice: [
          'Develop minor pieces before moving pawns excessively.',
          'Secure king safety via timely castling.',
          'Keep an eye on undefended tactical pieces.',
        ],
      };
    }

    return res.json({
      success: true,
      analysis: analysisData,
    });
  } catch (error: any) {
    console.error('Error analyzing chess game with Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze game',
    });
  }
});

// Nearby Room Management
app.post('/api/room/create', (req: Request, res: Response) => {
  const { playerId, initialTime = 300 } = req.body;
  // Generate random 4-letter or digit code
  let code = Math.floor(1000 + Math.random() * 9000).toString();
  while (nearbyRooms.has(code)) {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  }

  const room: NearbyRoom = {
    code,
    whitePlayerId: playerId || 'host',
    blackPlayerId: null,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '',
    lastMove: null,
    turn: 'w',
    whiteTime: initialTime,
    blackTime: initialTime,
    status: 'waiting',
    winner: null,
    lastUpdatedAt: Date.now(),
  };

  nearbyRooms.set(code, room);
  res.json({ success: true, room, role: 'w' });
});

app.post('/api/room/join', (req: Request, res: Response) => {
  const { code, playerId } = req.body;
  const room = nearbyRooms.get(String(code).trim());

  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found. Check the 4-digit code.' });
  }

  if (room.whitePlayerId === playerId) {
    return res.json({ success: true, room, role: 'w' });
  }

  if (!room.blackPlayerId || room.blackPlayerId === playerId) {
    room.blackPlayerId = playerId || 'guest';
    room.status = 'active';
    room.lastUpdatedAt = Date.now();
    return res.json({ success: true, room, role: 'b' });
  }

  return res.status(400).json({ success: false, error: 'Room is already full.' });
});

app.get('/api/room/:code', (req: Request, res: Response) => {
  const room = nearbyRooms.get(req.params.code);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  res.json({ success: true, room });
});

app.post('/api/room/:code/move', (req: Request, res: Response) => {
  const { code } = req.params;
  const { fen, pgn, lastMove, turn, whiteTime, blackTime, status, winner } = req.body;
  const room = nearbyRooms.get(code);

  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }

  room.fen = fen;
  room.pgn = pgn;
  room.lastMove = lastMove;
  room.turn = turn;
  if (whiteTime !== undefined) room.whiteTime = whiteTime;
  if (blackTime !== undefined) room.blackTime = blackTime;
  if (status) room.status = status;
  if (winner) room.winner = winner;
  room.lastUpdatedAt = Date.now();

  res.json({ success: true, room });
});

async function startServer() {
  const port = process.env.PORT || 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Grandmaster Chess server ready on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
