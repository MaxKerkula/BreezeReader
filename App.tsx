import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, Loader2, Library, BarChart2,  
  Trash2, FileCode, Sparkles, Trophy, 
  Settings, Check, ArrowLeft, Key, Edit2, Book
} from 'lucide-react';
import { ReadingSettings, LibraryItem, ReadingSession, VocabularyWord } from './types';
import SettingsPanel from './components/SettingsPanel';
import RSVPReader from './components/RSVPReader';
import AnalyticsView from './components/AnalyticsView';
import VocabularyView from './components/VocabularyView';
import { geminiService } from './services/geminiService';

declare const pdfjsLib: any;
declare const mammoth: any;
const STORAGE_KEY = 'breezereader_lib';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [view, setView] = useState<'landing' | 'library' | 'reader' | 'stats' | 'vocab' | 'import'>('landing');
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 48,
    lineHeight: 1.8,
    wordSpacing: 2,
    boldRatio: 0.5,
    fontFamily: 'OpenDyslexic',
    theme: 'dark',
    mode: 'rsvp-single',
    dictionaryMode: 'ai',
    wpm: 450,
    chunkSize: 1,
    showFocusGuide: true
  });

  const activeItem = useMemo(() => 
    library.find(item => item.id === activeItemId) || null, 
  [library, activeItemId]);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
          setHasApiKey(true);
        }
      } catch (e) {
        console.warn("API Key check failed, defaulting to free mode.");
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true);
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

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
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          text += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      } 
      else if (lowerName.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        text = result.value;
      }
      else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
         const raw = await file.text();
         const doc = new DOMParser().parseFromString(raw, 'text/html');
         text = doc.body.textContent || "";
      }
      else if (lowerName.endsWith('.rtf')) {
         const raw = await file.text();
         text = raw.replace(/\\par[d]?/g, '\n').replace(/\\.[^;{}]*;/g, '').replace(/[\\{}]+/g, '');
      }
      else { 
        text = await file.text(); 
      }

      if(!text.trim()) throw new Error("No text extracted");
      addToLibrary(file.name.replace(/\.[^/.]+$/, ""), text);
    } catch (err) { 
        console.error(err);
        alert("Failed to parse file. Please use PDF, DOCX, TXT, HTML, or RTF."); 
    }
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
    
    // Check key before attempting
    if (!hasApiKey && (window as any).aistudio) {
        try {
            await (window as any).aistudio.openSelectKey();
            setHasApiKey(true);
        } catch(e) {
            alert("API Key required for AI features. Please connect in Settings.");
            return;
        }
    }

    setIsLoadingAi(true);
    try {
      const simplified = await geminiService.rewrite(activeItem.content);
      const newTotal = simplified.split(/\s+/).filter(w => w.length > 0).length;
      setLibrary(prev => prev.map(item => 
        item.id === activeItem.id ? { ...item, content: simplified, totalWords: newTotal, lastPosition: 0 } : item
      ));
    } catch (error) { 
        console.error(error);
        alert("AI Rewrite failed. Check connection.");
    }
    finally { setIsLoadingAi(false); }
  };

  const startEditing = (item: LibraryItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
  };

  const saveTitle = (id: string) => {
    setLibrary(prev => prev.map(item => 
      item.id === id ? { ...item, title: editTitle } : item
    ));
    setEditingItemId(null);
  };

  const handleUpdateWord = (wordId: string, updates: Partial<VocabularyWord>) => {
    setLibrary(prev => prev.map(item => ({
      ...item,
      vocabulary: item.vocabulary.map(v => v.id === wordId ? { ...v, ...updates } : v)
    })));
  };

  const themeClass = settings.theme === 'dark' ? 'bg-black text-slate-100' : settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#433422]' : 'bg-white text-slate-900';

  // Extract Import UI for reuse
  const ImportInterface = () => (
    <div className="w-full bg-slate-900/60 backdrop-blur-3xl rounded-[4rem] p-12 border border-white/5 shadow-3xl space-y-10">
        <div className="space-y-6">
        <div className="flex justify-between items-center px-4">
            <label className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.4em]">Engine Import</label>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">PDF, DOCX, TXT, MD, HTML</span>
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
            {isParsing ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileCode className="w-7 h-7" />} IMPORT <input type="file" accept=".txt,.pdf,.docx,.md,.rtf,.html" className="hidden" onChange={handleFileUpload} />
        </label>
        </div>
    </div>
  );

  return (
    <div 
      className={`min-h-screen flex flex-col transition-colors duration-700 ${themeClass}`}
      style={{ fontFamily: settings.fontFamily }}
    >
      <header className="px-6 md:px-10 h-24 flex items-center justify-between border-b border-white/5 sticky top-0 z-[60] bg-black/40 backdrop-blur-3xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 group-hover:scale-105 transition-all">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white fill-current" />
            </div>
            <span className="hidden md:block font-black text-2xl tracking-tighter uppercase italic">Breeze<span className="text-indigo-500">Reader</span></span>
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
                className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 transition-all ${view === tab.id ? 'text-indigo-400 underline underline-offset-8' : 'text-slate-500 hover:text-white'}`} 
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
                className="hidden sm:flex px-4 py-3 md:px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 items-center gap-2 shadow-xl shadow-indigo-600/20"
               >
                 {isLoadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                 <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">AI Rewrite</span>
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

      {/* Settings Modal Layer */}
      {showSettings && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)}>
            <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <SettingsPanel 
                   settings={settings} 
                   setSettings={setSettings} 
                   hasApiKey={hasApiKey}
                   onConnectAi={handleSelectKey}
                />
            </div>
         </div>
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {view === 'landing' && (
            <div className="max-w-7xl mx-auto w-full pt-24 px-10 pb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
               <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 items-center">
                  <div className="lg:col-span-2 space-y-10">
                     <h1 className="text-7xl sm:text-8xl xl:text-9xl font-black tracking-tighter leading-none italic uppercase">Read<br/><span className="text-indigo-600">Faster.</span></h1>
                     <p className="text-2xl text-slate-500 font-medium leading-relaxed max-w-md">Professional speed reading suite with dyslexia support.</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => setView('vocab')} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-2 cursor-pointer hover:bg-white/10 transition-colors">
                           <Trophy className="w-6 h-6 text-indigo-500" />
                           <div className="text-[10px] font-black uppercase tracking-widest">Training Suite</div>
                        </div>
                        <div onClick={() => setView('stats')} className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-2 cursor-pointer hover:bg-white/10 transition-colors">
                           <BarChart2 className="w-6 h-6 text-indigo-500" />
                           <div className="text-[10px] font-black uppercase tracking-widest">Progress Tracking</div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-3">
                     <ImportInterface />
                  </div>
               </div>
            </div>
        )}

        {view === 'import' && (
            <div className="max-w-4xl mx-auto w-full pt-20 px-10 pb-20 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <button onClick={() => setView('library')} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> <span className="text-xs font-black uppercase tracking-widest">Back to Library</span>
                </button>
                <div className="mb-6">
                    <h2 className="text-4xl font-black text-white italic uppercase mb-2">Import Content</h2>
                    <p className="text-slate-500 font-medium">Add text from any source to your library.</p>
                </div>
                <ImportInterface />
            </div>
        )}

        {view === 'library' && (
            <div className="max-w-6xl mx-auto w-full pt-20 px-10 animate-in fade-in zoom-in-95 duration-700">
               <div className="flex items-center justify-between mb-16">
                  <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic">Cloud Library</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                  {library.map(item => (
                     <div key={item.id} onClick={() => { setActiveItemId(item.id); setView('reader'); }} className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-[3.5rem] p-10 transition-all cursor-pointer flex flex-col hover:scale-[1.02] shadow-2xl relative">
                        <div className="flex justify-between items-start mb-8 gap-4">
                            {editingItemId === item.id ? (
                                <div className="flex-1 flex gap-2 z-20" onClick={e => e.stopPropagation()}>
                                    <input 
                                        className="bg-black border border-indigo-500 rounded-xl px-3 py-1 text-lg font-black italic w-full focus:outline-none"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && saveTitle(item.id)}
                                    />
                                    <button onClick={() => saveTitle(item.id)} className="p-2 bg-indigo-600 rounded-xl"><Check className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <h3 className="text-2xl font-black text-white line-clamp-2 uppercase italic leading-tight flex-1">{item.title}</h3>
                            )}
                            
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); startEditing(item); }} className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setLibrary(l => l.filter(i => i.id !== item.id)); if(activeItemId === item.id) setActiveItemId(null); }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        <div className="mt-auto space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Added</div>
                                    <div className="text-sm font-bold text-white mt-1">{new Date(item.date).toLocaleDateString()}</div>
                                </div>
                                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Words</div>
                                    <div className="text-sm font-bold text-white mt-1">{item.totalWords.toLocaleString()}</div>
                                </div>
                           </div>
                           <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span>Progress</span>
                                    <span>{Math.round((item.lastPosition / Math.max(1, item.totalWords)) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${(item.lastPosition / Math.max(1, item.totalWords)) * 100}%` }} />
                                </div>
                           </div>
                        </div>
                     </div>
                  ))}
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

        {view === 'stats' && <AnalyticsView library={library} />}
        {view === 'vocab' && <VocabularyView library={library} onUpdateWord={handleUpdateWord} />}

      </main>
    </div>
  );
};

export default App;