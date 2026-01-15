
import React, { useState, useMemo } from 'react';
import { VocabularyWord, LibraryItem } from '../types';
import { Search, BrainCircuit, Check, X, RotateCcw, Dumbbell, Star } from 'lucide-react';

interface VocabularyViewProps {
  library: LibraryItem[];
  onUpdateWord: (wordId: string, updates: Partial<VocabularyWord>) => void;
}

const VocabularyView: React.FC<VocabularyViewProps> = ({ library, onUpdateWord }) => {
  const [search, setSearch] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Flatten all vocab from all library items
  const allVocab = useMemo(() => {
    return library.flatMap(item => item.vocabulary).sort((a, b) => b.date - a.date);
  }, [library]);

  const filteredVocab = useMemo(() => {
    return allVocab.filter(v => v.word.toLowerCase().includes(search.toLowerCase()));
  }, [allVocab, search]);

  const reviewQueue = useMemo(() => {
    const now = Date.now();
    return allVocab.filter(v => !v.nextReview || v.nextReview <= now);
  }, [allVocab]);

  const handleReview = (rating: 'hard' | 'good' | 'easy') => {
    const word = reviewQueue[currentCardIndex];
    if (!word) return;

    let nextInterval = 0; // minutes
    let newProficiency = word.proficiency || 0;

    // Simple SRS Logic
    if (rating === 'hard') {
      nextInterval = 10; // 10 mins
      newProficiency = Math.max(0, newProficiency - 1);
    } else if (rating === 'good') {
      nextInterval = 24 * 60; // 1 day
      newProficiency = Math.min(5, newProficiency + 1);
    } else if (rating === 'easy') {
      nextInterval = 3 * 24 * 60; // 3 days
      newProficiency = Math.min(5, newProficiency + 2);
    }

    onUpdateWord(word.id, {
      proficiency: newProficiency,
      nextReview: Date.now() + (nextInterval * 60 * 1000)
    });

    setIsFlipped(false);
    if (currentCardIndex < reviewQueue.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setReviewMode(false);
      setCurrentCardIndex(0);
    }
  };

  if (reviewMode && reviewQueue.length > 0) {
    const card = reviewQueue[currentCardIndex];
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 animate-in fade-in slide-in-from-bottom-10">
         <div className="w-full max-w-2xl text-center mb-8">
            <h2 className="text-3xl font-black italic uppercase text-white tracking-tight flex items-center justify-center gap-3">
               <Dumbbell className="w-8 h-8 text-indigo-500" />
               Brain Training
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">{reviewQueue.length - currentCardIndex} cards remaining</p>
         </div>

         <div className="relative w-full max-w-xl aspect-[3/2] perspective-1000 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
               {/* Front */}
               <div className="absolute inset-0 backface-hidden bg-slate-900 border border-white/10 rounded-[3rem] flex items-center justify-center p-12 shadow-3xl hover:border-indigo-500/50 transition-colors">
                  <h3 className="text-5xl font-black text-white italic">{card.word}</h3>
                  <div className="absolute bottom-8 text-[10px] uppercase tracking-[0.3em] text-slate-600">Click to Flip</div>
               </div>
               
               {/* Back */}
               <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-900/20 border border-indigo-500/30 rounded-[3rem] flex flex-col items-center justify-center p-12 shadow-3xl backdrop-blur-3xl">
                  <p className="text-2xl text-white font-medium mb-6 leading-relaxed">{card.definition}</p>
                  <p className="text-indigo-300 italic text-sm">"{card.examples[0]}"</p>
               </div>
            </div>
         </div>

         {isFlipped && (
           <div className="flex gap-4 mt-12 animate-in fade-in slide-in-from-bottom-4">
             <button onClick={(e) => { e.stopPropagation(); handleReview('hard'); }} className="px-8 py-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all">Hard</button>
             <button onClick={(e) => { e.stopPropagation(); handleReview('good'); }} className="px-8 py-4 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all">Good</button>
             <button onClick={(e) => { e.stopPropagation(); handleReview('easy'); }} className="px-8 py-4 rounded-2xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all">Easy</button>
           </div>
         )}
         
         <button onClick={() => setReviewMode(false)} className="mt-12 text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest">Exit Review</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full pt-20 px-10 pb-20">
       <div className="flex items-end justify-between mb-16">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic mb-4">Vocabulary</h2>
            <p className="text-slate-500 font-medium">Build your lexicon. Master difficult terms.</p>
          </div>
          {reviewQueue.length > 0 && (
            <button onClick={() => setReviewMode(true)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center gap-3 active:scale-95 transition-all animate-pulse">
               <BrainCircuit className="w-5 h-5" />
               Review Due ({reviewQueue.length})
            </button>
          )}
       </div>

       <div className="relative mb-10 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search your collection..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
       </div>

       {filteredVocab.length > 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVocab.map(v => (
               <div key={v.id} className="bg-white/5 border border-white/5 hover:border-white/10 p-8 rounded-[2.5rem] space-y-4 transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black text-white italic uppercase">{v.word}</h3>
                    {v.proficiency > 3 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  </div>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">{v.definition}</p>
                  {v.examples[0] && <div className="p-3 bg-black/20 rounded-xl text-xs text-indigo-300 italic border border-white/5">"{v.examples[0]}"</div>}
                  <div className="pt-4 flex items-center justify-between border-t border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Level {v.proficiency || 0}</span>
                     <span className="text-[10px] font-bold text-slate-700">{new Date(v.date).toLocaleDateString()}</span>
                  </div>
               </div>
            ))}
         </div>
       ) : (
         <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
             <Search className="w-12 h-12" />
             <span className="text-xl font-black uppercase tracking-widest">No Matches Found</span>
         </div>
       )}
    </div>
  );
};

export default VocabularyView;
