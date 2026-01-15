
export type Theme = 'light' | 'dark' | 'sepia';
export type ReadingMode = 'rsvp-single' | 'rsvp-chunk' | 'flow' | 'classic';

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
  wpm: number;
  chunkSize: number;
  showFocusGuide: boolean;
}
