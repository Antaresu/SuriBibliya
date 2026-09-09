import { StudyNote, Highlight, Bookmark, AppTheme } from '../types/bible';

const NOTES_KEY = 'suribibliya_notes';
const HIGHLIGHTS_KEY = 'suribibliya_highlights';
const BOOKMARKS_KEY = 'suribibliya_bookmarks';
const SETTINGS_KEY = 'suribibliya_settings';

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

class NotesService {
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
    return savedNote;
  }

  deleteNote(id: string): void {
    const notes = this.getNotes().filter(n => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
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
      return false; // removed
    } else {
      bookmarks.unshift({
        ...bookmark,
        id: 'bm_' + Math.random().toString(36).substring(2, 9),
        createdAt: Date.now()
      });
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true; // added
    }
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
    return updated;
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
