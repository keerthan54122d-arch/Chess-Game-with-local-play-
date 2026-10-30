import React, { useState, useEffect } from 'react';
import { X, Bluetooth, Users, Radio, Smartphone, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { bluetoothService, BluetoothStatus } from '../../services/bluetooth';
import { nearbyRoomService } from '../../services/nearbyRoom';
import { GameMode } from '../../types/chess';

interface NearbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLocalPassAndPlay: (autoFlip: boolean) => void;
  onStartBluetoothGame: () => void;
  onStartRoomGame: (code: string, role: 'w' | 'b') => void;
  initialTimeSeconds: number;
}

export const NearbyModal: React.FC<NearbyModalProps> = ({
  isOpen,
  onClose,
  onStartLocalPassAndPlay,
  onStartBluetoothGame,
  onStartRoomGame,
  initialTimeSeconds,
}) => {
  const [activeTab, setActiveTab] = useState<'pass_play' | 'bluetooth' | 'room_code'>('pass_play');
  const [autoFlip, setAutoFlip] = useState(true);

  // Bluetooth states
  const [btStatus, setBtStatus] = useState<BluetoothStatus>(bluetoothService.getStatus());
  const [btError, setBtError] = useState<string | null>(null);

  // Room code states
  const [roomAction, setRoomAction] = useState<'choose' | 'host' | 'join'>('choose');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = bluetoothService.onStatusChange((status, errorMsg) => {
      setBtStatus(status);
      if (errorMsg) setBtError(errorMsg);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleConnectBluetooth = async () => {
    setBtError(null);
    const success = await bluetoothService.connect();
    if (success) {
      onStartBluetoothGame();
      onClose();
    }
  };

  const handleCreateRoom = async () => {
    setRoomLoading(true);
    setRoomError(null);
    const res = await nearbyRoomService.createRoom(initialTimeSeconds);
    setRoomLoading(false);
    if (res.success && res.code) {
      setGeneratedCode(res.code);
      setRoomAction('host');
      onStartRoomGame(res.code, 'w');
    } else {
      setRoomError(res.error || 'Failed to generate room code');
    }
  };

  const handleJoinRoom = async () => {
    if (!inputCode.trim()) return;
    setRoomLoading(true);
    setRoomError(null);
    const res = await nearbyRoomService.joinRoom(inputCode.trim());
    setRoomLoading(false);
    if (res.success) {
      onStartRoomGame(inputCode.trim(), 'b');
      onClose();
    } else {
      setRoomError(res.error || 'Room not found. Check the code.');
    }
  };

  const handleStartPassAndPlay = () => {
    onStartLocalPassAndPlay(autoFlip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Nearby & Local Multiplayer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-950 rounded-xl my-4 border border-slate-800">
          <button
            onClick={() => setActiveTab('pass_play')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'pass_play'
                ? 'bg-slate-800 text-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>

          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'bluetooth'
                ? 'bg-slate-800 text-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Bluetooth</span>
          </button>

          <button
            onClick={() => setActiveTab('room_code')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'room_code'
                ? 'bg-slate-800 text-amber-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Direct Code</span>
          </button>
        </div>

        {/* Tab 1: Pass & Play (Local match on 1 device) */}
        {activeTab === 'pass_play' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">Local Tabletop Match</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Play face-to-face with a friend on this device. Both players take turns on the same
                chessboard.
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                <div>
                  <span className="text-xs font-medium text-slate-300">Auto-Flip Board on Turn</span>
                  <p className="text-[11px] text-slate-500">Rotate board 180° so the moving player faces their pieces</p>
                </div>
                <button
                  onClick={() => setAutoFlip(!autoFlip)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoFlip ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      autoFlip ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleStartPassAndPlay}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Start Pass & Play Match</span>
            </button>
          </div>
        )}

        {/* Tab 2: Web Bluetooth Connectivity */}
        {activeTab === 'bluetooth' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Bluetooth Device Pairing</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    btStatus === 'connected'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : btStatus === 'scanning' || btStatus === 'connecting'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {btStatus.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Connect directly to an opponent's nearby phone, tablet, or Bluetooth controller using
                the Web Bluetooth API.
              </p>

              {bluetoothService.getDeviceName() && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paired with: {bluetoothService.getDeviceName()}</span>
                </div>
              )}

              {btError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 flex items-start gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{btError}</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 space-y-1">
                <p>• Make sure Bluetooth is enabled on both devices.</p>
                <p>• Keep devices within 10 meters (30 feet) of each other.</p>
                <p>• If your device limits Bluetooth permissions, use the Direct Code tab.</p>
              </div>
            </div>

            <button
              onClick={handleConnectBluetooth}
              disabled={btStatus === 'scanning' || btStatus === 'connecting'}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {btStatus === 'scanning' || btStatus === 'connecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning for Bluetooth Device...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4" />
                  <span>Scan & Connect Bluetooth Device</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: Direct 4-digit code (Nearby cross-device sync) */}
        {activeTab === 'room_code' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">Direct Code Match</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect two nearby devices (phones, laptops, tablets) instantly using a simple 4-digit PIN code.
              </p>

              {roomAction === 'host' && generatedCode && (
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/50 text-center space-y-2">
                  <span className="text-xs text-slate-400">Share this Room Code with your nearby friend:</span>
                  <div className="text-3xl font-black font-mono tracking-widest text-amber-400">
                    {generatedCode}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Waiting for nearby player to join...</span>
                  </div>
                </div>
              )}

              {roomAction === 'join' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">
                    Enter Host's 4-Digit Room Code:
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4829"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-2xl font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl py-2 text-amber-400 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                  {roomError && <p className="text-xs text-red-400">{roomError}</p>}
                </div>
              )}
            </div>

            {roomAction === 'choose' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={roomLoading}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm flex flex-col items-center justify-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  <span>Host Match (Generate Code)</span>
                </button>
                <button
                  onClick={() => setRoomAction('join')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors border border-slate-700 flex flex-col items-center justify-center gap-1"
                >
                  <Radio className="w-4 h-4" />
                  <span>Join Match (Enter Code)</span>
                </button>
              </div>
            )}

            {roomAction === 'join' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setRoomAction('choose')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={inputCode.length !== 4 || roomLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  {roomLoading ? 'Connecting...' : 'Join Match'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
