import React, { useState, useEffect, useRef } from 'react';
import { BookMetadata } from '../types/bible';
import { bibleService } from '../services/bibleService';
import { Search, X, Globe } from 'lucide-react';

import { translations, AppLanguage } from '../services/i18n';

interface SearchModalProps {
  books: BookMetadata[];
  isOpen: boolean;
  initialLanguage?: 'tgl' | 'en' | 'all';
  lang?: AppLanguage;
  onClose: () => void;
  onSelectVerse: (book: BookMetadata, chapter: number, verse: number) => void;
}

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

  useEffect(() => {
    if (isOpen) {
      setSearchLang(initialLanguage);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, initialLanguage]);

  // Handle Quick Reference Jump vs Full-text search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
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
    }, 200);

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
    if (searchLang === 'tgl') return "Maghanap sa Tagalog (hal. 'pag-ibig', 'pananampalataya', 'Roma 8:28')...";
    if (searchLang === 'en') return "Search in English KJV (e.g. 'grace', 'faith', 'Romans 8:28')...";
    return "Maghanap sa Tagalog at English (hal. 'biyaya', 'grace', 'Juan 3:16')...";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', height: '80vh' }}>
        {/* Search Input Bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-card)'
        }}>
          <Search size={20} className="text-gold" />
          <input
            ref={inputRef}
            type="text"
            placeholder={getPlaceholder()}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.02rem',
              outline: 'none'
            }}
          />
          {query && (
            <button className="action-icon-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          padding: '8px 20px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem'
        }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Globe size={13} />
              <span>{t.searchLangLabel}</span>
            </span>
            <button 
              className={`testament-tab ${searchLang === 'tgl' ? 'active' : ''}`}
              style={{ padding: '3px 9px', fontSize: '0.75rem' }}
              onClick={() => setSearchLang('tgl')}
            >
              {t.tagalogAdb}
            </button>
            <button 
              className={`testament-tab ${searchLang === 'en' ? 'active' : ''}`}
              style={{ padding: '3px 9px', fontSize: '0.75rem' }}
              onClick={() => setSearchLang('en')}
            >
              {t.englishKjv}
            </button>
            <button 
              className={`testament-tab ${searchLang === 'all' ? 'active' : ''}`}
              style={{ padding: '3px 9px', fontSize: '0.75rem' }}
              onClick={() => setSearchLang('all')}
            >
              {t.bothLanguages}
            </button>
          </div>

          {/* Testament Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t.testamentLabel}</span>
            <button 
              className={`testament-tab ${testament === 'ALL' ? 'active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              onClick={() => setTestament('ALL')}
            >
              {lang === 'en' ? 'All' : 'Lahat'}
            </button>
            <button 
              className={`testament-tab ${testament === 'OT' ? 'active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              onClick={() => setTestament('OT')}
            >
              OT
            </button>
            <button 
              className={`testament-tab ${testament === 'NT' ? 'active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              onClick={() => setTestament('NT')}
            >
              NT
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isSearching ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              {t.searchingInVerses}
            </div>
          ) : results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {t.foundResults}: {results.length} ({query}):
              </div>
              {results.map((res, idx) => {
                const bookTitle = lang === 'en' ? res.book.name : res.book.tagalog;
                const altTitle = lang === 'en' ? res.book.tagalog : res.book.name;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectVerse(res.book, res.c, res.v);
                      onClose();
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.92rem' }}>
                        {bookTitle} {res.c}:{res.v} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>({altTitle})</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lang === 'en' ? 'Click to open' : 'Pindutin para buksan'}</span>
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
          ) : query ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              {t.noResultsFor} "{query}". {lang === 'en' ? 'Try changing language filter or verify spelling.' : 'Subukang baguhin ang wika o i-check ang spelling.'}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {searchLang === 'tgl' ? 'Paghahanap sa Tagalog (ADB)' : searchLang === 'en' ? 'English Verse Search (KJV)' : 'Bilingual Scripture Search'}
              </div>
              <div style={{ fontSize: '0.82rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
                {t.searchHints}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
