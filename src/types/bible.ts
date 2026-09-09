export interface BookMetadata {
  id: number;
  osis: string;
  name: string;
  tagalog: string;
  testament: 'OT' | 'NT';
  category: string;
  chapters: number;
}

export interface CrossRefEntry {
  to: string;
  votes: number;
}

export interface Verse {
  v: number;
  adb: string;
  kjv: string;
  orig: string;
  refs: CrossRefEntry[];
}

export interface BookData {
  metadata: BookMetadata;
  chapters: Record<string, Verse[]>;
}

export interface StrongsEntry {
  lemma: string;
  xlit: string;
  pron: string;
  derivation: string;
  def: string;
  kjv: string;
}

export type StrongsDictionary = Record<string, StrongsEntry>;

export interface StudyNote {
  id: string;
  title?: string;
  verseKey: string; // e.g. "43.1.1" or "general"
  bookId: number;
  chapter: number;
  verse: number;
  referenceName: string; // e.g. "Juan 1:1"
  content: string;
  verseSnippet?: string;
  includeVerseSnippet?: boolean;
  tags: string[];
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Highlight {
  verseKey: string;
  color: string; // 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose'
  createdAt: number;
}

export interface Bookmark {
  id: string;
  verseKey: string;
  bookId: number;
  chapter: number;
  verse: number;
  referenceName: string;
  createdAt: number;
}

export type ViewMode = 'single' | 'parallel' | 'interlinear';
export type ActiveTranslation = 'adb' | 'kjv' | 'orig';
export type AppTheme = 'obsidian' | 'parchment' | 'sapphire' | 'light';

export interface LogicConnective {
  word: string;
  type: 'cause' | 'inference' | 'contrast' | 'condition' | 'purpose';
  meaning: string;
}

export interface LogicSyllogism {
  majorPremise: string;
  minorPremise: string;
  conclusion: string;
  validityNote: string;
}

export interface ExegesisAnalysis {
  reference: string;
  genre: string;
  historicalContext: string;
  connectivesFound: LogicConnective[];
  syllogism: LogicSyllogism;
  keyThemes: string[];
  originalNuances: string[];
  hermeneuticalApplication: string;
  aiExegesisText?: string;
}

export interface SearchItem {
  b: number;
  c: number;
  v: number;
  tgl: string;
  en: string;
}
