import React, { useState, useEffect, useRef } from 'react';
import { BookMetadata } from '../types/bible';
import { bibleService } from '../services/bibleService';
import { Search, X, Globe, ChevronLeft, Sparkles, BookOpen } from 'lucide-react';
import { translations, AppLanguage } from '../services/i18n';

interface SearchModalProps {
  books: BookMetadata[];
  isOpen: boolean;
  initialLanguage?: 'tgl' | 'en' | 'all';
  lang?: AppLanguage;
  onClose: () => void;
  onSelectVerse: (book: BookMetadata, chapter: number, verse: number) => void;
}

const QUICK_VERSES = [
  'Juan 3:16',
  'Awit 23:1',
  'Roma 8:28',
  'Filipos 4:13',
  'Genesis 1:1',
  'Kawikaan 3:5',
  '1 Corinto 13:4',
  'Mateo 28:19',
  'Santiago 1:5'
];

const QUICK_TOPICS = [
  { tgl: 'Pag-ibig', en: 'Love' },
  { tgl: 'Pananampalataya', en: 'Faith' },
  { tgl: 'Biyaya', en: 'Grace' },
  { tgl: 'Kapayapaan', en: 'Peace' },
  { tgl: 'Kaligtasan', en: 'Salvation' },
  { tgl: 'Karunungan', en: 'Wisdom' },
  { tgl: 'Pag-asa', en: 'Hope' },
  { tgl: 'Panalangin', en: 'Prayer' }
];

export const SearchModal: React.FC<SearchModalProps> = ({
  books,
  isOpen,
  initialLanguage = 'tgl',
  lang = 'tl',
  onClose,
  onSelectVerse
}) => {
  const [query, setQuery] = useState('');
  const [testament, setTestament] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [searchLang, setSearchLang] = useState<'tgl' | 'en' | 'all'>(initialLanguage);
  const [results, setResults] = useState<Array<{ book: BookMetadata; c: number; v: number; tgl: string; en: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang] || translations.tl;

  // Preload search index and focus input on open
  useEffect(() => {
    if (isOpen) {
      bibleService.preloadSearchIndex();
      setSearchLang(initialLanguage);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setResults([]);
      setIsSearching(false);
    }
  }, [isOpen, initialLanguage]);

  // Handle Quick Reference Jump vs Full-text search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      // Check if it's a reference like "Juan 3:16" or "John 3:16"
      const parsed = bibleService.parseReference(query, books);
      if (parsed) {
        const bookData = await bibleService.getBookData(parsed.book.id);
        if (bookData && bookData.chapters[String(parsed.chapter)]) {
          const vList = bookData.chapters[String(parsed.chapter)];
          const targetVerse = parsed.verse ? vList[parsed.verse - 1] : vList[0];
          if (targetVerse) {
            setResults([{
              book: parsed.book,
              c: parsed.chapter,
              v: targetVerse.v,
              tgl: targetVerse.adb,
              en: targetVerse.kjv.replace(/<S>\d+<\/S>/g, '').trim()
            }]);
            setIsSearching(false);
            return;
          }
        }
      }

      // Otherwise, perform full-text search with chosen language filter
      const searchRes = await bibleService.search(query, {
        testament: testament === 'ALL' ? undefined : testament,
        translation: searchLang
      });
      setResults(searchRes);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, testament, searchLang, books]);

  if (!isOpen) return null;

  const highlightMatch = (text: string, term: string) => {
    if (!term || !text) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} style={{ background: 'var(--accent-gold-glow)', color: 'var(--accent-gold)', fontWeight: 700, borderRadius: '2px', padding: '0 2px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  const getPlaceholder = () => {
    if (searchLang === 'tgl') return "Maghanap sa Tagalog (hal. 'pag-ibig', 'Roma 8:28')...";
    if (searchLang === 'en') return "Search in English KJV (e.g. 'grace', 'Romans 8:28')...";
    return "Maghanap sa Tagalog at English (hal. 'biyaya', 'Juan 3:16')...";
  };

  const handleApplyQuickQuery = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  return (
    <div className="modal-overlay search-modal-overlay" onClick={onClose}>
      <div 
        className="modal-card search-modal-card" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '680px' }}
      >
        {/* Search Input Bar with Mobile Back Button */}
        <div className="search-header-bar" style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-card)'
        }}>
          {/* Mobile Back Button - Thumb accessible */}
          <button
            type="button"
            className="search-mobile-back-btn"
            onClick={onClose}
            aria-label="Bumalik sa Bibliya"
            title="Bumalik sa Bibliya"
          >
            <ChevronLeft size={22} />
            <span className="search-back-text">{lang === 'en' ? 'Back' : 'Bumalik'}</span>
          </button>

          <Search size={18} className="text-gold search-input-icon" />

          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder={getPlaceholder()}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-main-input"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              minWidth: 0
            }}
          />

          {query && (
            <button 
              type="button" 
              className="action-icon-btn" 
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              title="I-clear ang hanap"
              aria-label="I-clear"
            >
              <X size={16} />
            </button>
          )}

          <button 
            type="button" 
            className="modal-close-btn hide-on-mobile" 
            onClick={onClose}
            title="Isara"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls Bar - Smooth Horizontal Scrolling Chips (No line wrapping) */}
        <div className="search-filter-bar">
          {/* Language Selector Chips */}
          <div className="search-filter-group">
            <span className="search-filter-label">
              <Globe size={13} />
              <span>{t.searchLangLabel}</span>
            </span>
            <button 
              type="button"
              className={`testament-tab ${searchLang === 'tgl' ? 'active' : ''}`}
              onClick={() => setSearchLang('tgl')}
            >
              {t.tagalogAdb}
            </button>
            <button 
              type="button"
              className={`testament-tab ${searchLang === 'en' ? 'active' : ''}`}
              onClick={() => setSearchLang('en')}
            >
              {t.englishKjv}
            </button>
            <button 
              type="button"
              className={`testament-tab ${searchLang === 'all' ? 'active' : ''}`}
              onClick={() => setSearchLang('all')}
            >
              {t.bothLanguages}
            </button>
          </div>

          <span className="search-filter-divider">|</span>

          {/* Testament Selector Chips */}
          <div className="search-filter-group">
            <span className="search-filter-label-muted">{t.testamentLabel}</span>
            <button 
              type="button"
              className={`testament-tab ${testament === 'ALL' ? 'active' : ''}`}
              onClick={() => setTestament('ALL')}
            >
              {lang === 'en' ? 'All' : 'Lahat'}
            </button>
            <button 
              type="button"
              className={`testament-tab ${testament === 'OT' ? 'active' : ''}`}
              onClick={() => setTestament('OT')}
            >
              OT (Lumang Tipan)
            </button>
            <button 
              type="button"
              className={`testament-tab ${testament === 'NT' ? 'active' : ''}`}
              onClick={() => setTestament('NT')}
            >
              NT (Bagong Tipan)
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="search-results-container">
          {isSearching ? (
            <div className="search-loading-state">
              <div className="search-spinner" />
              <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {t.searchingInVerses}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lang === 'en' ? 'Filtering through 31,296 verses...' : 'Naglilibot sa buong Lumang at Bagong Tipan...'}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="search-results-list">
              <div className="search-results-count-bar">
                <span>{t.foundResults}: <strong style={{ color: 'var(--accent-gold)' }}>{results.length}</strong></span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>"{query}"</span>
              </div>
              {results.map((res, idx) => {
                const bookTitle = lang === 'en' ? res.book.name : res.book.tagalog;
                const altTitle = lang === 'en' ? res.book.tagalog : res.book.name;

                return (
                  <div
                    key={idx}
                    className="search-result-card"
                    onClick={() => {
                      onSelectVerse(res.book, res.c, res.v);
                      onClose();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.94rem' }}>
                        {bookTitle} {res.c}:{res.v} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>({altTitle})</span>
                      </div>
                      <span className="search-result-badge">{lang === 'en' ? 'Open' : 'Buksan'}</span>
                    </div>

                    {res.tgl && (
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.72rem', marginRight: '6px' }}>ADB:</span>
                        {highlightMatch(res.tgl, query)}
                      </div>
                    )}

                    {res.en && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', marginRight: '6px' }}>KJV:</span>
                        {highlightMatch(res.en, query)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : query.trim().length >= 2 ? (
            /* Clear Empty State when No Verses Matched */
            <div className="search-empty-state">
              <div className="search-empty-icon-box">
                <Search size={32} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {t.noResultsFor} "{query}"
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                {lang === 'en'
                  ? 'No matching scripture verses found. Check spelling, try another word, or switch language to "Both".'
                  : 'Walang talatang tumugma. Pakisuri ang baybay o subukang piliin ang "Lahat" sa wika at tipan.'}
              </p>

              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '8px 18px', fontSize: '0.82rem', marginBottom: '20px' }}
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                {lang === 'en' ? 'Clear Search' : 'I-clear ang Search'}
              </button>

              <div className="search-suggestions-box">
                <div style={{ fontSize: '0.78rem', color: 'var(--text-gold)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <Sparkles size={14} />
                  <span>{lang === 'en' ? 'Try searching these:' : 'Maaari mong subukan:'}</span>
                </div>
                <div className="search-chips-wrap">
                  {['Juan 3:16', 'Roma 8:28', 'Pag-ibig', 'Biyaya', 'Pananampalataya'].map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      className="search-quick-chip"
                      onClick={() => handleApplyQuickQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Initial Rich Guidance Dashboard when Search Opens */
            <div className="search-initial-dashboard">
              {/* Popular Verse References */}
              <div className="search-section">
                <div className="search-section-header">
                  <BookOpen size={15} className="text-gold" />
                  <span>{lang === 'en' ? 'Popular Scripture Verses' : 'Mga Kilalang Talata'}</span>
                </div>
                <div className="search-chips-wrap">
                  {QUICK_VERSES.map((ref, i) => (
                    <button
                      key={i}
                      type="button"
                      className="search-quick-chip verse-chip"
                      onClick={() => handleApplyQuickQuery(ref)}
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Topics */}
              <div className="search-section" style={{ marginTop: '16px' }}>
                <div className="search-section-header">
                  <Sparkles size={15} className="text-gold" />
                  <span>{lang === 'en' ? 'Key Biblical Topics' : 'Mga Mahahalagang Paksa'}</span>
                </div>
                <div className="search-chips-wrap">
                  {QUICK_TOPICS.map((topic, i) => {
                    const label = lang === 'en' ? topic.en : topic.tgl;
                    return (
                      <button
                        key={i}
                        type="button"
                        className="search-quick-chip topic-chip"
                        onClick={() => handleApplyQuickQuery(label)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {t.searchHints}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
