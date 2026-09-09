import { StudyNote, Highlight, Bookmark, AppTheme } from '../types/bible';

const NOTES_KEY = 'suribibliya_notes';
const HIGHLIGHTS_KEY = 'suribibliya_highlights';
const BOOKMARKS_KEY = 'suribibliya_bookmarks';
const SETTINGS_KEY = 'suribibliya_settings';

const IDB_NAME = 'SuriBibliya_DB';
const IDB_STORE = 'save_store';
const IDB_KEY = 'save_dat';

export interface UserSettings {
  geminiApiKey: string;
  theme: AppTheme;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'sans';
  defaultTranslation: 'adb' | 'kjv' | 'orig';
  showStrongsByDefault: boolean;
  searchLanguage: 'tgl' | 'en' | 'all';
  appLanguage: 'tl' | 'en';
}

export interface SuriBibliyaSaveData {
  signature: 'SURIBIBLIYA_SAVE_DATA';
  version: 1;
  timestamp: number;
  exportedAt: string;
  notes: StudyNote[];
  bookmarks: Bookmark[];
  highlights: Record<string, Highlight>;
  settings: UserSettings;
}

const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: '',
  theme: 'obsidian',
  fontSize: 'medium',
  fontFamily: 'serif',
  defaultTranslation: 'adb',
  showStrongsByDefault: true,
  searchLanguage: 'tgl',
  appLanguage: 'tl'
};

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

class NotesService {
  constructor() {
    this.initPersistence();
  }

  // Automatic recovery from IndexedDB if localStorage was cleared
  private async initPersistence(): Promise<void> {
    try {
      const hasLocalNotes = localStorage.getItem(NOTES_KEY);
      const hasLocalBookmarks = localStorage.getItem(BOOKMARKS_KEY);
      const hasLocalHighlights = localStorage.getItem(HIGHLIGHTS_KEY);

      // If localStorage is completely empty, try recovering from IndexedDB
      if (!hasLocalNotes && !hasLocalBookmarks && !hasLocalHighlights) {
        const db = await openIDB();
        if (db) {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(IDB_KEY);
          req.onsuccess = () => {
            const data: SuriBibliyaSaveData | undefined = req.result;
            if (data && data.signature === 'SURIBIBLIYA_SAVE_DATA') {
              if (data.notes) localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
              if (data.bookmarks) localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(data.bookmarks));
              if (data.highlights) localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(data.highlights));
              if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
            }
          };
        }
      } else {
        // Sync current state to IndexedDB as ongoing backup
        this.saveToIndexedDB();
      }
    } catch {
      // Ignore background persistence errors
    }
  }

  private async saveToIndexedDB(): Promise<void> {
    try {
      const db = await openIDB();
      if (!db) return;
      const payload = this.generateSaveDataPayload();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(payload, IDB_KEY);
    } catch {
      // Ignore background IDB errors
    }
  }

  private generateSaveDataPayload(): SuriBibliyaSaveData {
    return {
      signature: 'SURIBIBLIYA_SAVE_DATA',
      version: 1,
      timestamp: Date.now(),
      exportedAt: new Date().toISOString(),
      notes: this.getNotes(),
      bookmarks: this.getBookmarks(),
      highlights: this.getHighlights(),
      settings: this.getSettings()
    };
  }

  // Study Notes
  getNotes(): StudyNote[] {
    try {
      const data = localStorage.getItem(NOTES_KEY);
      if (!data) return [];
      let parsed: StudyNote[] = JSON.parse(data);
      // Clean up test notes requested by user (Juan 1:2 and Juan 1:12)
      if (localStorage.getItem('suribibliya_cleaned_test_notes_v2') !== 'true') {
        parsed = parsed.filter(n => !(n.referenceName === 'Juan 1:2' || n.referenceName === 'Juan 1:12' || n.verseKey === '43.1.2' || n.verseKey === '43.1.12'));
        localStorage.setItem(NOTES_KEY, JSON.stringify(parsed));
        localStorage.setItem('suribibliya_cleaned_test_notes_v2', 'true');
      }
      return parsed;
    } catch {
      return [];
    }
  }

  clearAllNotes(): void {
    localStorage.removeItem(NOTES_KEY);
    this.saveToIndexedDB();
  }

  getNoteForVerse(verseKey: string): StudyNote | undefined {
    return this.getNotes().find(n => n.verseKey === verseKey);
  }

  saveNote(note: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): StudyNote {
    const notes = this.getNotes();
    const now = Date.now();
    let savedNote: StudyNote;

    if (note.id) {
      const index = notes.findIndex(n => n.id === note.id);
      if (index !== -1) {
        savedNote = {
          ...notes[index],
          ...note,
          updatedAt: now
        };
        notes[index] = savedNote;
      } else {
        savedNote = {
          ...note,
          id: note.id,
          createdAt: now,
          updatedAt: now
        } as StudyNote;
        notes.unshift(savedNote);
      }
    } else {
      savedNote = {
        ...note,
        id: 'note_' + Math.random().toString(36).substring(2, 10),
        createdAt: now,
        updatedAt: now
      } as StudyNote;
      notes.unshift(savedNote);
    }

    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    this.saveToIndexedDB();
    return savedNote;
  }

  deleteNote(id: string): void {
    const notes = this.getNotes().filter(n => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    this.saveToIndexedDB();
  }

  // Highlights
  getHighlights(): Record<string, Highlight> {
    try {
      const data = localStorage.getItem(HIGHLIGHTS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  setHighlight(verseKey: string, color: string | null): void {
    const highlights = this.getHighlights();
    if (!color) {
      delete highlights[verseKey];
    } else {
      highlights[verseKey] = {
        verseKey,
        color,
        createdAt: Date.now()
      };
    }
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
    this.saveToIndexedDB();
  }

  clearAllHighlights(): void {
    localStorage.removeItem(HIGHLIGHTS_KEY);
    this.saveToIndexedDB();
  }

  // Bookmarks
  getBookmarks(): Bookmark[] {
    try {
      const data = localStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  toggleBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): boolean {
    const bookmarks = this.getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.verseKey === bookmark.verseKey);
    if (existingIndex !== -1) {
      bookmarks.splice(existingIndex, 1);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      this.saveToIndexedDB();
      return false; // removed
    } else {
      bookmarks.unshift({
        ...bookmark,
        id: 'bm_' + Math.random().toString(36).substring(2, 9),
        createdAt: Date.now()
      });
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      this.saveToIndexedDB();
      return true; // added
    }
  }

  deleteBookmark(verseKey: string): void {
    const bookmarks = this.getBookmarks().filter(b => b.verseKey !== verseKey);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    this.saveToIndexedDB();
  }

  clearAllBookmarks(): void {
    localStorage.removeItem(BOOKMARKS_KEY);
    this.saveToIndexedDB();
  }

  isBookmarked(verseKey: string): boolean {
    return this.getBookmarks().some(b => b.verseKey === verseKey);
  }

  // Settings
  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    this.saveToIndexedDB();
    return updated;
  }

  // =========================================================
  // SAVE.DAT SYSTEM (Comprehensive Backup & Restore)
  // =========================================================

  /**
   * Generates a portable save.dat string containing all bookmarks, notes,
   * highlights, and user preferences.
   */
  exportSaveDat(): string {
    const payload = this.generateSaveDataPayload();
    // Use JSON stringification with signature
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Triggers an automatic download of the save.dat file onto the user's phone or computer.
   */
  downloadSaveDat(): void {
    const datString = this.exportSaveDat();
    const blob = new Blob([datString], { type: 'application/octet-stream;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `SuriBibliya_SaveData_${dateStr}.dat`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Restores all data from a save.dat file string into localStorage & IndexedDB.
   */
  async importSaveDat(content: string): Promise<{
    success: boolean;
    notesCount: number;
    bookmarksCount: number;
    highlightsCount: number;
    error?: string;
  }> {
    try {
      const parsed = JSON.parse(content);
      if (!parsed || (parsed.signature !== 'SURIBIBLIYA_SAVE_DATA' && !parsed.notes && !parsed.bookmarks)) {
        return { success: false, notesCount: 0, bookmarksCount: 0, highlightsCount: 0, error: 'Maling save.dat format o corrupt ang file.' };
      }

      // Restore notes
      if (Array.isArray(parsed.notes)) {
        localStorage.setItem(NOTES_KEY, JSON.stringify(parsed.notes));
      }

      // Restore bookmarks
      if (Array.isArray(parsed.bookmarks)) {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(parsed.bookmarks));
      }

      // Restore highlights
      if (parsed.highlights && typeof parsed.highlights === 'object') {
        localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(parsed.highlights));
      }

      // Restore settings
      if (parsed.settings && typeof parsed.settings === 'object') {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed.settings));
      }

      await this.saveToIndexedDB();

      return {
        success: true,
        notesCount: Array.isArray(parsed.notes) ? parsed.notes.length : 0,
        bookmarksCount: Array.isArray(parsed.bookmarks) ? parsed.bookmarks.length : 0,
        highlightsCount: parsed.highlights ? Object.keys(parsed.highlights).length : 0
      };
    } catch (err: any) {
      return { success: false, notesCount: 0, bookmarksCount: 0, highlightsCount: 0, error: err.message || 'Error habang binabasa ang file.' };
    }
  }

  // Export Notes to Markdown
  exportNotesToMarkdown(): string {
    const notes = this.getNotes();
    if (notes.length === 0) return '# Walang Tala\n\nWala pang nai-save na study notes.';

    let md = `# Mga Tala sa Pag-aaral ng Bibliya (SuriBibliya AI)\n\nInilabas noong: ${new Date().toLocaleDateString('fil-PH')}\n\n---\n\n`;
    for (const n of notes) {
      md += `### ${n.title ? n.title + ' (' + n.referenceName + ')' : n.referenceName}\n`;
      if (n.verseSnippet) {
        md += `> *"${n.verseSnippet}"*\n\n`;
      }
      md += `*Kategorya/Tags:* ${n.tags.length > 0 ? n.tags.join(', ') : 'Pangkalahatan'} | *Kulay:* ${n.color}\n\n`;
      md += `${n.content}\n\n`;
      md += `*Petsa ng pagtatala:* ${new Date(n.updatedAt).toLocaleString('fil-PH')}\n\n---\n\n`;
    }
    return md;
  }
}

export const notesService = new NotesService();
