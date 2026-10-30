/**
 * Nearby Room Sync Service.
 * Allows two nearby players on separate phones, laptops, or browser tabs
 * to pair via a 4-digit room code with real-time polling and BroadcastChannel fallback.
 */

export interface RoomState {
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

export class NearbyRoomService {
  private pollingInterval: any = null;
  private currentCode: string | null = null;
  private playerId: string;
  private role: 'w' | 'b' | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private updateCallbacks: Array<(state: RoomState, role: 'w' | 'b' | null) => void> = [];

  constructor() {
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('chess_room_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.code === this.currentCode) {
            this.notify(event.data);
          }
        };
      } catch {
        // ignore
      }
    }
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  public getRole(): 'w' | 'b' | null {
    return this.role;
  }

  public onUpdate(cb: (state: RoomState, role: 'w' | 'b' | null) => void) {
    this.updateCallbacks.push(cb);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter((c) => c !== cb);
    };
  }

  private notify(state: RoomState) {
    this.updateCallbacks.forEach((cb) => cb(state, this.role));
  }

  public async createRoom(initialSeconds: number): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.playerId, initialTime: initialSeconds }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        this.currentCode = data.room.code;
        this.role = 'w';
        this.startPolling(data.room.code);
        return { success: true, code: data.room.code };
      }
      return { success: false, error: data.error || 'Failed to create room' };
    } catch {
      // Local fallback room code
      const localCode = Math.floor(1000 + Math.random() * 9000).toString();
      this.currentCode = localCode;
      this.role = 'w';
      return { success: true, code: localCode };
    }
  }

  public async joinRoom(code: string): Promise<{ success: boolean; error?: string }> {
    const cleanCode = code.trim();
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, playerId: this.playerId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        this.currentCode = cleanCode;
        this.role = data.role || 'b';
        this.startPolling(cleanCode);
        this.notify(data.room);
        return { success: true };
      }
      return { success: false, error: data.error || 'Could not join room' };
    } catch {
      this.currentCode = cleanCode;
      this.role = 'b';
      return { success: true };
    }
  }

  public async sendMove(payload: {
    fen: string;
    pgn: string;
    lastMove: { from: string; to: string; promotion?: string; san: string };
    turn: 'w' | 'b';
    whiteTime?: number;
    blackTime?: number;
    status?: string;
    winner?: string | null;
  }) {
    if (!this.currentCode) return;

    // Send via BroadcastChannel for zero-latency local communication
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        code: this.currentCode,
        ...payload,
        lastUpdatedAt: Date.now(),
      });
    }

    try {
      await fetch(`/api/room/${this.currentCode}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore
    }
  }

  private startPolling(code: string) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            this.notify(data.room);
          }
        }
      } catch {
        // ignore
      }
    }, 1000);
  }

  public leaveRoom() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.currentCode = null;
    this.role = null;
  }
}

export const nearbyRoomService = new NearbyRoomService();
