import React, { useState, useMemo } from 'react';
import { BookMetadata } from '../types/bible';
import { Book, ChevronRight, X, Search, Layers } from 'lucide-react';
import { translations, AppLanguage } from '../services/i18n';

interface NavigationSidebarProps {
  books: BookMetadata[];
  selectedBook: BookMetadata | null;
  selectedChapter: number;
  isOpen: boolean;
  lang?: AppLanguage;
  onSelectPassage: (book: BookMetadata, chapter: number) => void;
  onCloseMobile: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  books,
  selectedBook,
  selectedChapter,
  isOpen,
  lang = 'tl',
  onSelectPassage,
  onCloseMobile
}) => {
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBookForChapterModal, setActiveBookForChapterModal] = useState<BookMetadata | null>(null);

  const t = translations[lang] || translations.tl;

  const getCategoryTitle = (cat: string) => {
    if (lang !== 'en') return cat;
    const map: Record<string, string> = {
      'Pentateuko / Batas': 'Pentateuch / Law',
      'Kasaysayan': 'Historical Books',
      'Karunungan at Tula': 'Wisdom & Poetry',
      'Pangunahing Propeta': 'Major Prophets',
      'Mababang Propeta': 'Minor Prophets',
      'Mga Ebanghelyo': 'Gospels',
      'Kasaysayan ng Simbahan': 'Church History',
      'Mga Sulat ni Pablo': 'Pauline Epistles',
      'Mga Pangkalahatang Sulat': 'General Epistles',
      'Pangitain / Propesiya': 'Apocalyptic / Prophecy'
    };
    return map[cat] || cat;
  };

  // Filter books by testament and search query
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      if (testamentFilter !== 'ALL' && b.testament !== testamentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return b.tagalog.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.osis.toLowerCase().includes(q);
      }
      return true;
    });
  }, [books, testamentFilter, searchQuery]);

  // Group books by category
  const categorizedBooks = useMemo(() => {
    const groups: Record<string, BookMetadata[]> = {};
    for (const b of filteredBooks) {
      const catKey = getCategoryTitle(b.category);
      if (!groups[catKey]) {
        groups[catKey] = [];
      }
      groups[catKey].push(b);
    }
    return groups;
  }, [filteredBooks, lang]);

  const handleBookClick = (book: BookMetadata) => {
    setActiveBookForChapterModal(book);
  };

  const handleChapterClick = (chapter: number) => {
    if (activeBookForChapterModal) {
      onSelectPassage(activeBookForChapterModal, chapter);
      setActiveBookForChapterModal(null);
      onCloseMobile();
    }
  };

  return (
    <>
      <aside className={`sidebar-drawer ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
              <Book size={18} />
              <span>{t.booksTitle}</span>
            </div>
            <button className="modal-close-btn" onClick={onCloseMobile} style={{ display: isOpen ? 'block' : 'none' }}>
              <X size={18} />
            </button>
          </div>

          {/* Quick Filter Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={t.searchBookPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 30px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem'
              }}
            />
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
          </div>

          {/* Testament Tabs */}
          <div className="testament-tabs">
            <button 
              className={`testament-tab ${testamentFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setTestamentFilter('ALL')}
            >
              {t.allBooks}
            </button>
            <button 
              className={`testament-tab ${testamentFilter === 'OT' ? 'active' : ''}`}
              onClick={() => setTestamentFilter('OT')}
            >
              {t.oldTestament}
            </button>
            <button 
              className={`testament-tab ${testamentFilter === 'NT' ? 'active' : ''}`}
              onClick={() => setTestamentFilter('NT')}
            >
              {t.newTestament}
            </button>
          </div>
        </div>

        {/* Books List */}
        <div className="books-scroll-list">
          {Object.entries(categorizedBooks).map(([catName, bookList]) => (
            <div key={catName} className="book-category-group">
              <div className="category-title">{catName}</div>
              {bookList.map(b => {
                const isSelected = selectedBook?.id === b.id;
                const primaryName = lang === 'en' ? b.name : b.tagalog;
                const secondaryName = lang === 'en' ? b.tagalog : b.name;

                return (
                  <button
                    key={b.id}
                    className={`book-item-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleBookClick(b)}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 500 }}>{primaryName}</div>
                      <div className="book-en-sub">{secondaryName} ({b.chapters} {t.chaptersCount})</div>
                    </div>
                    <ChevronRight size={14} style={{ opacity: isSelected ? 1 : 0.4 }} />
                  </button>
                );
              })}
            </div>
          ))}

          {filteredBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t.noBooksFound} "{searchQuery}".
            </div>
          )}
        </div>
      </aside>

      {/* Chapter Selection Modal */}
      {activeBookForChapterModal && (
        <div className="modal-overlay" onClick={() => setActiveBookForChapterModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <Layers size={20} className="text-gold" />
                <span>{t.selectChapterTitle}: {lang === 'en' ? activeBookForChapterModal.name : activeBookForChapterModal.tagalog}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveBookForChapterModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {lang === 'en'
                  ? `Book of ${activeBookForChapterModal.name} (${activeBookForChapterModal.tagalog}) • Total of ${activeBookForChapterModal.chapters} ${t.totalChapters}`
                  : `Aklat ng ${activeBookForChapterModal.tagalog} (${activeBookForChapterModal.name}) • May kabuuang ${activeBookForChapterModal.chapters} ${t.totalChapters}`}
              </div>
              <div className="chapter-grid-container">
                {Array.from({ length: activeBookForChapterModal.chapters }, (_, i) => i + 1).map(chNum => {
                  const isCurrent = selectedBook?.id === activeBookForChapterModal.id && selectedChapter === chNum;
                  return (
                    <button
                      key={chNum}
                      className={`chapter-btn ${isCurrent ? 'active' : ''}`}
                      onClick={() => handleChapterClick(chNum)}
                    >
                      {chNum}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
