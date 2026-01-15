
export type Theme = 'light' | 'dark' | 'sepia';
export type ReadingMode = 'rsvp-single' | 'rsvp-chunk' | 'flow' | 'classic';
export type DictionaryMode = 'ai' | 'standard';

export interface ReadingSession {
  date: number;
  wpm: number;
  duration: number; // in seconds
  wordsRead: number;
}

export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  examples: string[];
  date: number;
  // SRS Fields
  proficiency: number; // 0 = New, 1 = Hard, 2 = Good, 3 = Mastered
  nextReview: number; // Timestamp
}

export interface LibraryItem {
  id: string;
  title: string;
  content: string;
  lastPosition: number;
  date: number;
  totalWords: number;
  sessions: ReadingSession[];
  vocabulary: VocabularyWord[];
}

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  wordSpacing: number;
  boldRatio: number;
  fontFamily: 'Inter' | 'Lexend' | 'JetBrains Mono' | 'OpenDyslexic';
  theme: Theme;
  mode: ReadingMode;
  dictionaryMode: DictionaryMode;
  wpm: number;
  chunkSize: number;
  showFocusGuide: boolean;
}
