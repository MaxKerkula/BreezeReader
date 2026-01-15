
import React from 'react';
import { ReadingSettings, Theme, ReadingMode } from '../types';
import { 
  Type, Moon, Sun, Coffee, Zap, Sliders, 
  Layers, ArrowRightLeft, AlignLeft, Bold, Target 
} from 'lucide-react';

interface SettingsPanelProps {
  settings: ReadingSettings;
  setSettings: (settings: ReadingSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings }) => {
  const updateSetting = (key: keyof ReadingSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const themes: { id: Theme; icon: any; label: string }[] = [
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'sepia', icon: Coffee, label: 'Sepia' },
    { id: 'light', icon: Sun, label: 'Light' },
  ];

  const modes: { id: ReadingMode; label: string; icon: any }[] = [
    { id: 'rsvp-single', label: 'Single', icon: Zap },
    { id: 'rsvp-chunk', label: 'Chunks', icon: Layers },
    { id: 'flow', label: 'Flow', icon: ArrowRightLeft },
    { id: 'classic', label: 'Classic', icon: AlignLeft },
  ];

  const drills = [
      { label: 'Subvocalization Killer', config: { wpm: 900, mode: 'rsvp-single' } },
      { label: 'Peripheral Expansion', config: { wpm: 500, mode: 'rsvp-chunk', chunkSize: 3 } },
      { label: 'Anti-Regression Pacer', config: { wpm: 350, mode: 'classic' } },
  ];

  return (
    <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 shadow-3xl space-y-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <h3 className="font-black text-white text-xl flex items-center gap-3 tracking-tighter uppercase italic">
          <Sliders className="w-6 h-6 text-indigo-500" />
          Engine Configuration
        </h3>
      </div>

      {/* Drill Presets */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Training Presets</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {drills.map((drill) => (
            <button
              key={drill.label}
              onClick={() => setSettings({ ...settings, ...drill.config } as ReadingSettings)}
              className="py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20 flex flex-col items-center gap-2 text-center"
            >
              <Target className="w-4 h-4" />
              {drill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reading Mode */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Processing Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => updateSetting('mode', mode.id)}
              className={`py-5 px-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-3 border ${
                settings.mode === mode.id 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30 scale-105' 
                : 'bg-black border-white/5 text-slate-500 hover:border-white/20'
              }`}
            >
              <mode.icon className="w-5 h-5" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Speed Control */}
      <div className="space-y-6 p-8 bg-black border border-white/5 rounded-[2.5rem] shadow-inner">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Temporal Velocity</label>
          <span className="text-3xl font-black text-white italic">{settings.wpm}<span className="text-[10px] ml-1 text-slate-600 not-italic">WPM</span></span>
        </div>
        <input 
          type="range" min="100" max="1500" step="10" value={settings.wpm} 
          onChange={(e) => updateSetting('wpm', parseInt(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[8px] font-black text-slate-700 uppercase tracking-widest">
          <span>Patient</span>
          <span>Hyper-Sonic</span>
        </div>
      </div>

      {settings.mode === 'rsvp-chunk' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Fixation Span (Words)</label>
            <span className="text-lg font-black text-white">{settings.chunkSize}</span>
          </div>
          <input 
            type="range" min="2" max="5" step="1" value={settings.chunkSize} 
            onChange={(e) => updateSetting('chunkSize', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      )}

      {/* Typography */}
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Typography</label>
          <div className="flex flex-col gap-2">
            {['OpenDyslexic', 'Lexend', 'Inter', 'JetBrains Mono'].map((font) => (
              <button
                key={font}
                onClick={() => updateSetting('fontFamily', font)}
                className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  settings.fontFamily === font 
                  ? 'bg-white text-black border-white' 
                  : 'bg-black border-white/5 text-slate-500 hover:text-slate-300'
                }`}
                style={{ fontFamily: font }}
              >
                {font}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Visual Theme</label>
          <div className="flex flex-col gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => updateSetting('theme', t.id)}
                className={`py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-between ${
                  settings.theme === t.id 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-black border-white/5 text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
                <t.icon className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Engine Scale</label>
          <span className="text-sm font-black text-white">{settings.fontSize}px</span>
        </div>
        <input 
          type="range" min="16" max="100" value={settings.fontSize} 
          onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
};

export default SettingsPanel;
