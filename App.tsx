
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, Loader2, Library, BarChart2,  
  Trash2, FileCode, Sparkles, Trophy, 
  Settings, X, Book, BrainCircuit
} from 'lucide-react';
import { ReadingSettings, LibraryItem, ReadingSession, VocabularyWord } from './types';
import SettingsPanel from './components/SettingsPanel';
import RSVPReader from './components/RSVPReader';
import { geminiService } from './services/geminiService';

declare const pdfjsLib: any;
const STORAGE_KEY = 'breezereader_lib';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const App: React.FC = () => {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [view, setView] = useState<'landing' | 'library' | 'reader' | 'stats' | 'vocab'>('landing');
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 48,
    lineHeight: 1.8,
    wordSpacing: 2,
    boldRatio: 0.5,
    fontFamily: 'OpenDyslexic',
    theme: 'dark',
    mode: 'rsvp-single',
    wpm: 450,
    chunkSize: 1,
    showFocusGuide: true
  });

  const activeItem = useMemo(() => 
    library.find(item => item.id === activeItemId) || null, 
  [library, activeItemId]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLibrary(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  const addToLibrary = (title: string, content: string) => {
    if (!content.trim()) return;
    const newItem: LibraryItem = {
      id: generateId(),
      title: title || `Untitled Session ${library.length + 1}`,
      content,
      lastPosition: 0,
      date: Date.now(),
      totalWords: content.split(/\s+/).filter(w => w.length > 0).length,
      sessions: [],
      vocabulary: []
    };
    setLibrary(prev => [newItem, ...prev]);
    setActiveItemId(newItem.id);
    setView('reader');
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          text += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      } else { text = await file.text(); }
      addToLibrary(file.name.replace(/\.[^/.]+$/, ""), text);
    } catch (err) { alert("Format not supported. Use PDF or TXT."); }
    finally { setIsParsing(false); }
  };

  const updatePosition = useCallback((pos: number) => {
    if (!activeItemId) return;
    setLibrary(prev => prev.map(item => 
      item.id === activeItemId ? { ...item, lastPosition: pos } : item
    ));
  }, [activeItemId]);

  const logSession = useCallback((wpm: number, words: number, duration: number) => {
    if (!activeItemId) return;
    const session: ReadingSession = { date: Date.now(), wpm, duration, wordsRead: words };
    setLibrary(prev => prev.map(item => 
      item.id === activeItemId ? { ...item, sessions: [...item.sessions, session] } : item
    ));
  }, [activeItemId]);

  const addVocab = useCallback((word: VocabularyWord) => {
    if (!activeItemId) return;
    setLibrary(prev => prev.map(item => 
      item.id === activeItemId ? { ...item, vocabulary: [word, ...item.vocabulary] } : item
    ));
  }, [activeItemId]);

  const transformWithAi = async () => {
    if (!activeItem || isLoadingAi) return;
    setIsLoadingAi(true);
    try {
      const simplified = await geminiService.simplify(activeItem.content);
      const newTotal = simplified.split(/\s+/).filter(w => w.length > 0).length;
      setLibrary(prev => prev.map(item => 
        item.id === activeItem.id ? { ...item, content: simplified, totalWords: newTotal, lastPosition: 0 } : item
      ));
    } catch (error) { console.error(error); }
    finally { setIsLoadingAi(false); }
  };

  const themeClass = settings.theme === 'dark' ? 'bg-black text-slate-100' : settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#433422]' : 'bg-white text-slate-900';

  return (
    <div 
      className={`min-h-screen flex flex-col transition-colors duration-700 ${themeClass}`}
      style={{ fontFamily: settings.fontFamily }}
    >
      <header className="px-10 h-24 flex items-center justify-between border-b border-white/5 sticky top-0 z-[60] bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 group-hover:scale-105 transition-all">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">Breeze<span className="text-indigo-500">Reader</span></span>
          </div>
          
          <nav className="hidden xl:flex ml-12 gap-8">
            {[
              { id: 'library', label: 'Library', icon: Library },
              { id: 'stats', label: 'Analytics', icon: BarChart2 },
              { id: 'vocab', label: 'Vocabulary', icon: Book },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setView(tab.id as any)}
                className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 transition-all ${view === tab.id ? 'text-indigo-400 underline underline-offset-8' : 'text-slate-500 hover:text-white'}`} // Removed explicit opacity to let theme control readability better
                style={{ opacity: view === tab.id ? 1 : 0.6 }}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
           {view === 'reader' && (
             <div className="flex items-center gap-2">
               <button 
                onClick={transformWithAi}
                disabled={isLoadingAi}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-indigo-600/20"
               >
                 {isLoadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                 <span className="text-[10px] font-black uppercase tracking-widest">AI Simplify</span>
               </button>
               <button onClick={() => setShowSettings(!showSettings)} className="p-3 rounded-2xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all">
                  <Settings className="w-6 h-6" />
               </button>
             </div>
           )}
           <button onClick={() => setView('landing')} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 px-8">
              New Session
           </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {view === 'landing' && (
            <div className="max-w-7xl mx-auto w-full pt-24 px-10 pb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
               <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 items-center">
                  <div className="lg:col-span-2 space-y-10">
                     <h1 className="text-8xl xl:text-9xl font-black tracking-tighter leading-none italic uppercase">Read<br/><span className="text-indigo-600">Faster.</span></h1>
                     <p className="text-2xl text-slate-500 font-medium leading-relaxed max-w-md">Professional speed reading suite.</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-2">
                           <Trophy className="w-6 h-6 text-indigo-500" />
                           <div className="text-[10px] font-black uppercase tracking-widest">Training Suite</div>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-2">
                           <BarChart2 className="w-6 h-6 text-indigo-500" />
                           <div className="text-[10px] font-black uppercase tracking-widest">Progress Tracking</div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-3 w-full bg-slate-900/60 backdrop-blur-3xl rounded-[4rem] p-12 border border-white/5 shadow-3xl space-y-10">
                     <div className="space-y-6">
                        <div className="flex justify-between items-center px-4">
                          <label className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.4em]">Engine Import</label>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">PDF, DOCX, TXT, EPUB</span>
                        </div>
                        <textarea 
                          className="w-full h-96 p-12 rounded-[3.5rem] bg-black/60 border-2 border-white/5 focus:border-indigo-600 focus:ring-0 transition-all resize-none text-2xl font-medium text-slate-100 placeholder:text-slate-800 shadow-inner"
                          placeholder="Paste text or import files to launch..."
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                        />
                     </div>
                     <div className="flex flex-col sm:flex-row gap-6">
                        <button onClick={() => addToLibrary('', inputText)} disabled={!inputText.trim()} className="flex-[2] bg-white hover:bg-indigo-600 hover:text-white disabled:opacity-20 text-black py-8 rounded-[2.5rem] font-black text-2xl transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl">
                           <Zap className="w-8 h-8" /> LAUNCH READER
                        </button>
                        <label className="flex-1 cursor-pointer bg-white/5 hover:bg-white/10 py-8 rounded-[2.5rem] font-bold text-xl transition-all flex items-center justify-center gap-4 active:scale-95 text-slate-400 border border-white/5">
                           {isParsing ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileCode className="w-7 h-7" />} IMPORT <input type="file" accept=".txt,.pdf" className="hidden" onChange={handleFileUpload} />
                        </label>
                     </div>
                  </div>
               </div>
            </div>
        )}

        {view === 'library' && (
            <div className="max-w-6xl mx-auto w-full pt-20 px-10 animate-in fade-in zoom-in-95 duration-700">
               <div className="flex items-center justify-between mb-16">
                  <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic">Cloud Library</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                  {library.map(item => (
                     <div key={item.id} onClick={() => { setActiveItemId(item.id); setView('reader'); }} className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-[3.5rem] p-10 transition-all cursor-pointer flex flex-col hover:scale-[1.03] shadow-2xl">
                        <div className="flex justify-between mb-8">
                            <h3 className="text-2xl font-black text-white line-clamp-2 uppercase italic leading-tight">{item.title}</h3>
                            <button onClick={(e) => { e.stopPropagation(); setLibrary(l => l.filter(i => i.id !== item.id)); if(activeItemId === item.id) setActiveItemId(null); }} className="p-3 text-red-500 bg-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="mt-auto space-y-4">
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600" style={{ width: `${(item.lastPosition / Math.max(1, item.totalWords)) * 100}%` }} />
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
        )}

        {view === 'vocab' && (
            <div className="max-w-6xl mx-auto w-full pt-20 px-10">
               <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic mb-16">Vocabulary</h2>
               {activeItem?.vocabulary && activeItem.vocabulary.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {activeItem.vocabulary.map(v => (
                       <div key={v.id} className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] space-y-4">
                          <h3 className="text-2xl font-black text-white italic uppercase">{v.word}</h3>
                          <p className="text-slate-400 text-sm italic">{v.definition}</p>
                       </div>
                    ))}
                 </div>
               ) : (
                 <div className="py-20 text-center opacity-50">No vocab saved yet.</div>
               )}
            </div>
        )}

        {view === 'stats' && (
             <div className="max-w-6xl mx-auto w-full pt-20 px-10">
                <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic mb-16">Analytics</h2>
                <div className="p-10 bg-white/5 border border-white/5 rounded-[3rem]">
                   <div className="text-5xl font-black italic">{library.reduce((acc, i) => acc + i.totalWords, 0)}</div>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Words Processed</div>
                </div>
             </div>
        )}

        {view === 'reader' && activeItem && (
             <RSVPReader 
                 text={activeItem.content} 
                 settings={settings} 
                 initialPosition={activeItem.lastPosition}
                 onPositionChange={updatePosition}
                 onSessionEnd={logSession}
                 onDefineWord={addVocab}
               />
        )}

      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-500">
             <div className="absolute top-8 right-10 z-10"><button onClick={() => setShowSettings(false)} className="p-4 bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"><X className="w-7 h-7" /></button></div>
             <SettingsPanel settings={settings} setSettings={setSettings} />
          </div>
        </div>
      )}

      {isLoadingAi && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full border-2 border-indigo-600/20 border-t-indigo-600 animate-spin" />
              <BrainCircuit className="absolute inset-0 m-auto w-10 h-10 text-indigo-500 animate-pulse" />
           </div>
           <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Gemini Synthesis Engine</h2>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mt-2">Optimizing text structure...</p>
        </div>
      )}
    </div>
  );
};

export default App;
