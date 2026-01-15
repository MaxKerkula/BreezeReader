
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, FastForward, Rewind, 
  Clock, Target, Search, Loader2, BookPlus, X
} from 'lucide-react';
import { ReadingSettings, VocabularyWord } from '../types';
import { geminiService } from '../services/geminiService';
import { processBionicText } from '../utils/textProcessor';

interface RSVPReaderProps {
  text: string;
  settings: ReadingSettings;
  onPositionChange?: (index: number) => void;
  onSessionEnd?: (wpm: number, words: number, duration: number) => void;
  onDefineWord?: (word: VocabularyWord) => void;
  initialPosition?: number;
}

const RSVPReader: React.FC<RSVPReaderProps> = ({ 
  text, settings, onPositionChange, onSessionEnd, onDefineWord, initialPosition = 0 
}) => {
  const [wordIndex, setWordIndex] = useState(initialPosition);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Dictionary State
  const [definition, setDefinition] = useState<{word: string, def: string, example: string} | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  
  const words = useMemo(() => text.split(/\s+/).filter(w => w.length > 0), [text]);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const classicActiveRef = useRef<HTMLSpanElement | null>(null);
  const contextActiveRef = useRef<HTMLSpanElement | null>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (e.key.toLowerCase() === 'c') {
            e.preventDefault();
            setShowContext(prev => !prev);
            setIsPlaying(false);
        }
        if (e.code === 'Space') {
             e.preventDefault();
             setIsPlaying(prev => !prev);
        }
        if (e.key === 'ArrowLeft') {
            setWordIndex(i => Math.max(0, i - 10));
        }
        if (e.key === 'ArrowRight') {
            setWordIndex(i => Math.min(words.length - 1, i + 10));
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [words.length]);

  const getDelay = useCallback(() => {
    const baseDelay = (60 / settings.wpm) * 1000 * (settings.mode === 'rsvp-chunk' ? settings.chunkSize : 1);
    const currentWord = words[wordIndex] || "";
    
    let multiplier = 1;
    if (currentWord.match(/[.!?]$/)) multiplier = 2.0;
    else if (currentWord.match(/[,;:]$/)) multiplier = 1.5;
    else if (currentWord.length > 10) multiplier = 1.2;
    
    return baseDelay * multiplier;
  }, [settings.wpm, settings.chunkSize, settings.mode, wordIndex, words]);

  const playNext = useCallback(() => {
    setWordIndex((prev) => {
      const step = settings.mode === 'rsvp-chunk' ? settings.chunkSize : 1;
      const next = prev + step;
      if (next >= words.length) {
        setIsPlaying(false);
        if (startTime) {
          onSessionEnd?.(settings.wpm, words.length, (Date.now() - startTime) / 1000);
        }
        return prev;
      }
      return next;
    });
  }, [words.length, settings.mode, settings.chunkSize, startTime, onSessionEnd, settings.wpm]);

  // Main playback loop
  useEffect(() => {
    if (isPlaying && !showContext && wordIndex < words.length) {
      if (!startTime) setStartTime(Date.now());
      timerRef.current = window.setTimeout(playNext, getDelay());
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, showContext, wordIndex, getDelay, playNext]);

  useEffect(() => {
    onPositionChange?.(wordIndex);
  }, [wordIndex, onPositionChange]);

  // Auto-scroll for Classic Mode
  useEffect(() => {
    if (settings.mode === 'classic' && classicActiveRef.current) {
        classicActiveRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [wordIndex, settings.mode]);

  // Auto-scroll for Context Mode
  useEffect(() => {
    if (showContext && contextActiveRef.current) {
        requestAnimationFrame(() => {
            contextActiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
  }, [showContext]);

  const handleDefine = async (wordToDefine: string) => {
    const cleanWord = wordToDefine.replace(/[^\w]/g, '');
    if (!cleanWord || isLoadingDef) return;

    setIsLoadingDef(true);
    try {
      const contextSlice = words.slice(Math.max(0, wordIndex - 15), Math.min(words.length, wordIndex + 15)).join(' ');
      const result = await geminiService.defineWord(cleanWord, contextSlice, settings.dictionaryMode);
      setDefinition({
        word: cleanWord,
        def: result.definition,
        example: result.examples[0] || ''
      });
    } catch (e) { console.error(e); }
    finally { setIsLoadingDef(false); }
  };

  const saveToVocab = () => {
    if (definition && onDefineWord) {
      onDefineWord({
        id: Date.now().toString(),
        word: definition.word,
        definition: definition.def,
        examples: [definition.example],
        date: Date.now(),
        proficiency: 0,
        nextReview: Date.now()
      });
      setDefinition(null);
    }
  };

  const timeRemaining = useMemo(() => {
    const left = words.length - wordIndex;
    const sec = (left / settings.wpm) * 60;
    return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
  }, [words.length, wordIndex, settings.wpm]);

  // Dynamic Font Scaling for Single Mode
  const singleModeFontSize = useMemo(() => {
    const base = settings.fontSize * 2;
    const word = words[wordIndex] || "";
    const len = word.length;
    
    // If word is short enough, use base size
    if (len <= 10) return `clamp(2rem, ${base}px, 12vw)`;

    // Calculate scale factor: e.g., 20 chars -> ~0.6x size
    const scale = Math.max(0.25, 12 / len); 
    return `clamp(1rem, ${base * scale}px, 12vw)`;
  }, [settings.fontSize, wordIndex, words]);

  const renderORPWord = (word: string) => {
    const len = word.length;
    let orp = 0;
    if (len > 1) orp = len <= 5 ? 1 : len <= 9 ? 2 : len <= 13 ? 3 : 4;

    const left = word.substring(0, orp);
    const center = word.substring(orp, orp + 1);
    const right = word.substring(orp + 1);

    return (
      <div className="flex w-full items-baseline justify-center whitespace-nowrap">
        <div className="flex-1 text-right text-slate-200 font-normal tracking-tight opacity-80 overflow-hidden text-ellipsis">{left}</div>
        <div className="text-red-500 font-black px-[1px] transform scale-110 drop-shadow-[0_0_15px_rgba(239,68,68,0.9)] z-10">{center}</div>
        <div className="flex-1 text-left text-slate-200 font-normal tracking-tight opacity-80 overflow-hidden text-ellipsis">{right}</div>
      </div>
    );
  };

  const renderInlineORP = (word: string) => {
    const len = word.length;
    let orp = 0;
    if (len > 1) orp = len <= 5 ? 1 : len <= 9 ? 2 : len <= 13 ? 3 : 4;

    const left = word.substring(0, orp);
    const center = word.substring(orp, orp + 1);
    const right = word.substring(orp + 1);

    return (
      <span className="inline-block">
        <span className="opacity-90">{left}</span>
        <span className="text-red-500 font-black mx-[0.5px] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">{center}</span>
        <span className="opacity-90">{right}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full flex-1 text-white relative h-full overflow-hidden select-none" ref={containerRef}>
      
      {/* UNIFIED STAGE WINDOW */}
      <div 
        className="relative w-full max-w-6xl h-[60vh] flex-shrink-0 my-auto bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden group transition-all duration-300 hover:border-white/20 hover:shadow-indigo-500/10 flex flex-col"
        onMouseEnter={() => { setIsPlaying(false); setShowContext(true); }}
        onMouseLeave={() => { setShowContext(false); setDefinition(null); }}
      >
         {/* -- STAGE HEADER (HUD) -- */}
         <div className="w-full flex justify-between items-center px-10 py-6 border-b border-white/5 bg-black/10 z-20">
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
               <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {timeRemaining}</div>
               <div className="flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" /> {settings.wpm} WPM</div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 opacity-60">
               Mode: <span className="text-white">{settings.mode.split('-').pop()}</span>
            </div>
         </div>

         {/* -- MAIN CONTENT AREA -- */}
         <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">

             {/* -- GUIDES LAYER (RSVP ONLY) -- */}
             {!showContext && settings.mode !== 'classic' && (
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                 <div className="w-full h-[1px] bg-indigo-500/30" />
                 <div className="h-16 w-[2px] bg-indigo-500/30" />
                 <div className="absolute top-0 w-full h-20 bg-gradient-to-b from-black/20 to-transparent" />
                 <div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-black/20 to-transparent" />
               </div>
             )}

             {/* 1. CONTEXT VIEW OVERLAY */}
             {showContext && (
                <div className="absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar p-12 animate-in fade-in duration-200 z-30 bg-black/60 backdrop-blur-md">
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 text-xl leading-relaxed text-center text-slate-300 font-medium font-lexend">
                        {words.map((w, i) => {
                        const isCurrent = i === wordIndex;
                        return (
                            <span 
                                key={i} 
                                ref={isCurrent ? contextActiveRef : null}
                                onClick={(e) => { e.stopPropagation(); handleDefine(w); }}
                                className={`cursor-pointer transition-all duration-200 rounded-lg px-2 py-1 ${
                                isCurrent 
                                ? 'bg-indigo-600 text-white font-bold scale-110 shadow-lg ring-2 ring-indigo-400 z-10' 
                                : 'hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {processBionicText(w, settings.boldRatio)}
                            </span>
                        )
                        })}
                    </div>
                    
                    {/* Definition Card */}
                    {isLoadingDef && (
                        <div className="sticky bottom-4 mt-8 flex justify-center z-50">
                            <div className="bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-xl border border-white/10 animate-in slide-in-from-bottom-2">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                <span className="text-sm font-bold uppercase tracking-widest">
                                    {settings.dictionaryMode === 'ai' ? 'Consulting Gemini...' : 'Dictionary Search...'}
                                </span>
                            </div>
                        </div>
                    )}
                    {definition && (
                        <div className="sticky bottom-4 mt-8 bg-slate-950 border border-white/10 rounded-3xl p-8 shadow-2xl max-w-xl mx-auto animate-in slide-in-from-bottom-4 z-50">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-3xl font-black italic text-white capitalize tracking-tight">{definition.word}</h3>
                                <div className="flex gap-2">
                                    <button onClick={saveToVocab} className="p-2 hover:bg-white/10 rounded-xl text-indigo-400 transition-colors" title="Save">
                                        <BookPlus className="w-6 h-6" />
                                    </button>
                                    <button onClick={() => setDefinition(null)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-200 text-lg leading-relaxed mb-6 font-medium">{definition.def}</p>
                            {definition.example && (
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <p className="text-slate-400 italic font-serif">"{definition.example}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
             )}

             {/* 2. CLASSIC MODE */}
             {!showContext && settings.mode === 'classic' && (
                <div className="absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar p-14 text-3xl leading-loose tracking-wide font-medium">
                    {words.map((w, i) => (
                        <span 
                            key={i} 
                            ref={i === wordIndex ? classicActiveRef : null}
                            className={`inline-block mr-3 mb-3 px-2 py-1 rounded-xl transition-all duration-200 ${
                            i === wordIndex 
                                ? 'text-white bg-indigo-600 font-bold scale-110 shadow-lg' 
                                : i > wordIndex 
                                    ? 'text-white/90' 
                                    : 'text-white/30'
                            }`}
                        >
                            {i === wordIndex ? w : processBionicText(w, settings.boldRatio)}
                        </span>
                    ))}
                </div>
             )}

             {/* 3. RSVP & FLOW MODES */}
             {!showContext && settings.mode !== 'classic' && (
                 <div 
                   className="relative w-full flex items-center justify-center text-center h-full"
                 >
                    <div style={{ 
                        fontSize: settings.mode === 'rsvp-single' ? singleModeFontSize : `clamp(2rem, ${settings.fontSize * 2}px, 12vw)`,
                        fontFamily: settings.fontFamily === 'JetBrains Mono' ? 'JetBrains Mono' : settings.fontFamily,
                        lineHeight: 1.1,
                        width: '100%',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        maxHeight: '100%'
                    }}>
                        {/* RSVP SINGLE */}
                        {settings.mode === 'rsvp-single' && (
                            <div className="w-full max-w-5xl">{renderORPWord(words[wordIndex] || "")}</div>
                        )}

                        {/* RSVP CHUNK */}
                        {settings.mode === 'rsvp-chunk' && (
                            <div className="flex flex-wrap items-center justify-center content-center gap-x-6 gap-y-2 w-full text-center leading-snug">
                                {words.slice(wordIndex, wordIndex + settings.chunkSize).map((w, i) => (
                                    <span key={i} className="text-slate-100 font-medium inline-block break-anywhere">
                                        {processBionicText(w, settings.boldRatio)}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* FLOW MODE */}
                        {settings.mode === 'flow' && (
                            <div className="w-full overflow-hidden mask-linear-fade">
                                <div className="flex justify-center items-baseline gap-16 whitespace-nowrap">
                                    {words.slice(Math.max(0, wordIndex - 2), Math.min(words.length, wordIndex + 3)).map((w, i) => {
                                        const absIndex = i + Math.max(0, wordIndex - 2);
                                        const isCurrent = absIndex === wordIndex;
                                        return (
                                            <span key={i} className={`transition-all duration-200 ${
                                                isCurrent 
                                                ? 'text-white scale-125 font-bold opacity-100 drop-shadow-2xl z-10' 
                                                : 'text-slate-500 scale-75 opacity-30 blur-[1px]'
                                            }`}>
                                                {isCurrent ? renderInlineORP(w) : processBionicText(w, settings.boldRatio)}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
             )}
         </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-auto flex flex-col items-center gap-8 w-full max-w-2xl px-10 pb-12 z-20">
        <div className="flex items-center gap-10">
          <button onClick={() => setWordIndex(Math.max(0, wordIndex - 50))} className="p-4 text-slate-600 hover:text-white transition-all hover:scale-110"><Rewind className="w-8 h-8" /></button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all active:scale-95 border-4 ${isPlaying ? 'bg-black text-white border-white/10' : 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_40px_rgba(79,70,229,0.4)]'}`}
          >
            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
          </button>

          <button onClick={() => setWordIndex(Math.min(words.length - 1, wordIndex + 50))} className="p-4 text-slate-600 hover:text-white transition-all hover:scale-110"><FastForward className="w-8 h-8" /></button>
        </div>

        <div className="w-full space-y-4">
          <div className="flex justify-between items-end px-2">
             <div className="flex gap-6">
               <button onClick={() => { setWordIndex(0); setIsPlaying(false); }} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors flex items-center gap-2 hover:bg-white/10 px-3 py-1 rounded-full"><RotateCcw className="w-3 h-3" /> Reset</button>
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Hover to Pause & Context</span>
             </div>
             <div className="text-[10px] font-black text-slate-500 tracking-[0.2em]">
               <span className="text-white">{wordIndex + 1}</span> / {words.length} <span className="ml-3 text-indigo-500 italic">{Math.round((wordIndex / words.length) * 100)}%</span>
             </div>
          </div>
          <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden group cursor-pointer">
             <div className="h-full bg-indigo-600 transition-all duration-100 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.6)]" style={{ width: `${(wordIndex / words.length) * 100}%` }} />
             <input type="range" min="0" max={words.length - 1} value={wordIndex} onChange={(e) => setWordIndex(parseInt(e.target.value))} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RSVPReader;
