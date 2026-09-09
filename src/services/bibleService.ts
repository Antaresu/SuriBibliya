import { BookMetadata, BookData, StrongsEntry, StrongsDictionary, SearchItem } from '../types/bible';

class BibleService {
  private books: BookMetadata[] = [];
  private bookCache: Map<number, BookData> = new Map();
  private greekStrongs: StrongsDictionary | null = null;
  private hebrewStrongs: StrongsDictionary | null = null;
  private searchIndex: SearchItem[] | null = null;

  // Load all canonical books metadata
  async getBooks(): Promise<BookMetadata[]> {
    if (this.books.length > 0) return this.books;
    try {
      const resp = await fetch('/bible_data/books.json');
      this.books = await resp.json();
      return this.books;
    } catch (err) {
      console.error('Failed to load books metadata', err);
      return [];
    }
  }

  // Load specific book data (cached)
  async getBookData(bookId: number): Promise<BookData | null> {
    if (this.bookCache.has(bookId)) {
      return this.bookCache.get(bookId)!;
    }
    try {
      const resp = await fetch(`/bible_data/books/${bookId}.json`);
      if (!resp.ok) return null;
      const data: BookData = await resp.json();
      this.bookCache.set(bookId, data);
      return data;
    } catch (err) {
      console.error(`Failed to load book ${bookId}`, err);
      return null;
    }
  }

  // Get Strong's definition for a key (e.g. "G3056" or "H7225" or "3056")
  async getStrongsEntry(rawKey: string, isGreekHint?: boolean): Promise<StrongsEntry | null> {
    let key = rawKey.trim().toUpperCase();
    if (!key.startsWith('G') && !key.startsWith('H')) {
      key = (isGreekHint ? 'G' : 'H') + key;
    }

    if (key.startsWith('G')) {
      if (!this.greekStrongs) {
        try {
          const resp = await fetch('/bible_data/strongs/greek.json');
          this.greekStrongs = await resp.json();
        } catch (err) {
          console.error('Failed to load Greek Strongs', err);
          return null;
        }
      }
      return this.greekStrongs ? this.greekStrongs[key] || null : null;
    } else {
      if (!this.hebrewStrongs) {
        try {
          const resp = await fetch('/bible_data/strongs/hebrew.json');
          this.hebrewStrongs = await resp.json();
        } catch (err) {
          console.error('Failed to load Hebrew Strongs', err);
          return null;
        }
      }
      return this.hebrewStrongs ? this.hebrewStrongs[key] || null : null;
    }
  }

  // Preload search index in the background so searches are instant (<20ms)
  async preloadSearchIndex(): Promise<void> {
    if (this.searchIndex) return;
    try {
      const resp = await fetch('/bible_data/search_index.json');
      if (resp.ok) {
        this.searchIndex = await resp.json();
      }
    } catch (err) {
      console.warn('Background search index preload deferred', err);
    }
  }

  // Universal Search across Tagalog & English
  async search(query: string, options?: { testament?: 'OT' | 'NT'; bookId?: number; translation?: 'all' | 'tgl' | 'en' }): Promise<Array<{ book: BookMetadata; c: number; v: number; tgl: string; en: string }>> {
    if (!query || query.trim().length < 2) return [];
    if (!this.searchIndex) {
      await this.preloadSearchIndex();
      if (!this.searchIndex) return [];
    }

    const books = await this.getBooks();
    const booksMap = new Map(books.map(b => [b.id, b]));

    // Normalize accents so 'ama' finds 'amá', 'umibig' finds 'umibíg'
    const normalize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const q = normalize(query.trim());
    const trans = options?.translation || 'all';

    const results: Array<{ book: BookMetadata; c: number; v: number; tgl: string; en: string }> = [];

    for (const item of this.searchIndex || []) {
      const book = booksMap.get(item.b);
      if (!book) continue;

      if (options?.testament && book.testament !== options.testament) continue;
      if (options?.bookId && book.id !== options.bookId) continue;

      let matched = false;
      if (trans === 'all' || trans === 'tgl') {
        if (item.tgl && normalize(item.tgl).includes(q)) matched = true;
      }
      if (!matched && (trans === 'all' || trans === 'en')) {
        if (item.en && normalize(item.en).includes(q)) matched = true;
      }

      if (matched) {
        results.push({
          book,
          c: item.c,
          v: item.v,
          tgl: item.tgl,
          en: item.en
        });
        if (results.length >= 60) break; // Limit top 60 results for performance
      }
    }

    return results;
  }

  // Helper to normalize book query and book names (handles Tagalog prefixes like "Mga Taga-", "Mga ", "Taga-")
  normalizeBookQuery(str: string): string {
    const cleaned = str.trim().toLowerCase();
    const numMatch = cleaned.match(/^([1-3])\s*(.*)$/);
    const prefix = numMatch ? numMatch[1] + ' ' : '';
    const rest = (numMatch ? numMatch[2] : cleaned)
      .replace(/\bmga\s+taga-|\bmga\s+|\btaga-/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return (prefix + rest).trim();
  }

  // Parse human query reference like "Juan 3:16", "Romans 8:28", "Gen 1:1", "Awit 23:1", "Roma 8:28"
  parseReference(ref: string, books: BookMetadata[]): { book: BookMetadata; chapter: number; verse?: number } | null {
    const cleaned = ref.trim();
    // Match pattern: "<Book name or abbreviation> <chapter>(:<verse>)?"
    const match = cleaned.match(/^([0-9]?\s*[a-zA-Z\s\-]+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;

    const bookQuery = this.normalizeBookQuery(match[1]);
    const chapter = parseInt(match[2], 10);
    const verse = match[3] ? parseInt(match[3], 10) : undefined;

    // Find best matching book using normalized comparison
    const found = books.find(b => {
      const tglNorm = this.normalizeBookQuery(b.tagalog);
      const nameNorm = this.normalizeBookQuery(b.name);
      const osisNorm = this.normalizeBookQuery(b.osis);
      return (
        tglNorm === bookQuery ||
        nameNorm === bookQuery ||
        osisNorm === bookQuery ||
        tglNorm.startsWith(bookQuery) ||
        nameNorm.startsWith(bookQuery) ||
        b.tagalog.toLowerCase().startsWith(match[1].trim().toLowerCase()) ||
        b.name.toLowerCase().startsWith(match[1].trim().toLowerCase())
      );
    });

    if (found && chapter >= 1 && chapter <= found.chapters) {
      return { book: found, chapter, verse };
    }
    return null;
  }

  // Format OSIS ref like "John.1.1" or "Prov.8.22-Prov.8.31" to readable text "Juan 1:1"
  formatOsisReference(osisRef: string, books: BookMetadata[], useTagalog: boolean = true): string {
    const firstPart = osisRef.split('-')[0];
    const parts = firstPart.split('.');
    if (parts.length >= 2) {
      const bookOsis = parts[0];
      const ch = parts[1];
      const v = parts[2] || '';
      const b = books.find(item => item.osis === bookOsis);
      const bName = b ? (useTagalog ? b.tagalog : b.name) : bookOsis;
      return v ? `${bName} ${ch}:${v}` : `${bName} ${ch}`;
    }
    return osisRef;
  }
}

export const bibleService = new BibleService();
