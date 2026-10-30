import React, { useState } from 'react';
import { X, Clock, Palette, Check } from 'lucide-react';
import { TimerConfig, TimePreset, BoardTheme } from '../../types/chess';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: TimerConfig;
  currentTheme: BoardTheme;
  onSave: (config: TimerConfig, theme: BoardTheme) => void;
}

interface PresetOption {
  id: TimePreset;
  title: string;
  category: string;
  minutes: number;
  increment: number;
}

const PRESETS: PresetOption[] = [
  { id: 'bullet_1', title: '1 min', category: 'Bullet', minutes: 1, increment: 0 },
  { id: 'bullet_2_1', title: '2 + 1s', category: 'Bullet', minutes: 2, increment: 1 },
  { id: 'blitz_3', title: '3 min', category: 'Blitz', minutes: 3, increment: 0 },
  { id: 'blitz_3_2', title: '3 + 2s', category: 'Blitz', minutes: 3, increment: 2 },
  { id: 'blitz_5', title: '5 min', category: 'Blitz', minutes: 5, increment: 0 },
  { id: 'rapid_10', title: '10 min', category: 'Rapid', minutes: 10, increment: 0 },
  { id: 'rapid_15_10', title: '15 + 10s', category: 'Rapid', minutes: 15, increment: 10 },
  { id: 'classical_30', title: '30 min', category: 'Classical', minutes: 30, increment: 0 },
];

export const TimerModal: React.FC<TimerModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  currentTheme,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(currentConfig.enabled);
  const [selectedPreset, setSelectedPreset] = useState<TimePreset>(currentConfig.preset);
  const [customMinutes, setCustomMinutes] = useState(currentConfig.initialMinutes || 10);
  const [customIncrement, setCustomIncrement] = useState(currentConfig.incrementSeconds || 0);
  const [theme, setTheme] = useState<BoardTheme>(currentTheme);

  if (!isOpen) return null;

  const handleApply = () => {
    let initialMinutes = customMinutes;
    let incrementSeconds = customIncrement;

    if (selectedPreset !== 'custom') {
      const match = PRESETS.find((p) => p.id === selectedPreset);
      if (match) {
        initialMinutes = match.minutes;
        incrementSeconds = match.increment;
      }
    }

    onSave(
      {
        enabled,
        preset: enabled ? selectedPreset : 'none',
        initialMinutes,
        incrementSeconds,
      },
      theme
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Match Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timer Toggle */}
        <div className="py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-200">Chess Clock Timer</div>
              <div className="text-xs text-slate-400">Play with time controls or untimed</div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preset Buttons */}
          {enabled && (
            <div className="mt-4 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Time Control
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESETS.map((p) => {
                  const isSelected = selectedPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPreset(p.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[11px] font-medium text-slate-400">{p.category}</span>
                      <span className="text-sm font-bold font-mono mt-0.5">{p.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Time Option */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedPreset('custom')}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    selectedPreset === 'custom'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Custom Time & Increment
                </button>

                {selectedPreset === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Initial Time (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Increment (seconds per move)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={customIncrement}
                        onChange={(e) =>
                          setCustomIncrement(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Board Theme Selection */}
        <div className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-slate-200">Board Appearance</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'tournament_wood', name: 'Tournament Wood', light: '#e8d0a9', dark: '#b07b46' },
              { id: 'emerald_classic', name: 'Emerald Classic', light: '#eeeed2', dark: '#769656' },
              { id: 'midnight_slate', name: 'Midnight Slate', light: '#cbd5e1', dark: '#475569' },
              { id: 'carbon_dark', name: 'Carbon Dark', light: '#a1a1aa', dark: '#3f3f46' },
            ].map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as BoardTheme)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500 text-amber-300'
                      : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex w-6 h-6 rounded-md overflow-hidden border border-slate-700 shrink-0">
                      <div className="w-3 h-6" style={{ backgroundColor: t.light }} />
                      <div className="w-3 h-6" style={{ backgroundColor: t.dark }} />
                    </div>
                    <span className="text-xs font-medium text-left">{t.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
