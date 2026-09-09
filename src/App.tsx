import React, { useState, useEffect } from 'react';
import { BookMetadata, Verse } from './types/bible';
import { bibleService } from './services/bibleService';
import { notesService, UserSettings } from './services/notesService';

import { NavigationSidebar } from './components/NavigationSidebar';
import { ReaderPanel } from './components/ReaderPanel';
import { LogicInspector } from './components/LogicInspector';
import { NotesDrawer } from './components/NotesDrawer';
import { StrongsModal } from './components/StrongsModal';
import { CrossRefDrawer } from './components/CrossRefDrawer';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';

import { 
  BookOpen, 
  Search, 
  Brain, 
  Edit3, 
  Settings, 
  Menu, 
  Bookmark as BookmarkIcon, 
  Compass,
  Palette,
  BookMarked,
  X
} from 'lucide-react';
import { translations, AppLanguage } from './services/i18n';

export const App: React.FC = () => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookMetadata | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);

  // Drawers & Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [strongsKey, setStrongsKey] = useState<string | null>(null);
  const [isStrongsGreek, setIsStrongsGreek] = useState<boolean>(true);
  const [crossRefVerse, setCrossRefVerse] = useState<Verse | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  // Settings & Storage
  const [settings, setSettings] = useState<UserSettings>(notesService.getSettings());
  const [highlights, setHighlights] = useState(notesService.getHighlights());
  const [bookmarks, setBookmarks] = useState(notesService.getBookmarks());

  // Load books metadata on mount
  useEffect(() => {
    bibleService.getBooks().then(loadedBooks => {
      setBooks(loadedBooks);
      // Default to Gospel of John (Book 43) or Genesis (Book 1)
      const defaultBook = loadedBooks.find(b => b.id === 43) || loadedBooks[0];
      if (defaultBook) {
        setSelectedBook(defaultBook);
        setSelectedChapter(1);
      }
    });
  }, []);

  // Update theme class on body
  useEffect(() => {
    document.body.className = `theme-${settings.theme}`;
  }, [settings.theme]);

  // Load verses when book or chapter changes
  useEffect(() => {
    if (!selectedBook) return;
    bibleService.getBookData(selectedBook.id).then(data => {
      if (data && data.chapters[String(selectedChapter)]) {
        const chVerses = data.chapters[String(selectedChapter)];
        setVerses(chVerses);
        setSelectedVerse(chVerses[0] || null);
      }
    });
  }, [selectedBook?.id, selectedChapter]);

  // Global Keyboard shortcuts (Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setSettingsModalOpen(false);
        setStrongsKey(null);
        setCrossRefVerse(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const handleSelectPassage = (book: BookMetadata, chapter: number, verseNum?: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    if (verseNum) {
      setTimeout(() => {
        const elem = document.getElementById(`verse-${verseNum}`);
        elem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else if (selectedBook && selectedBook.id > 1) {
      const prevBook = books.find(b => b.id === selectedBook.id - 1);
      if (prevBook) {
        setSelectedBook(prevBook);
        setSelectedChapter(prevBook.chapters);
      }
    }
  };

  const handleNextChapter = () => {
    if (selectedBook && selectedChapter < selectedBook.chapters) {
      setSelectedChapter(prev => prev + 1);
    } else if (selectedBook && selectedBook.id < 66) {
      const nextBook = books.find(b => b.id === selectedBook.id + 1);
      if (nextBook) {
        setSelectedBook(nextBook);
        setSelectedChapter(1);
      }
    }
  };

  const handleOpenStrongs = (num: string, isGreek: boolean) => {
    setStrongsKey(num);
    setIsStrongsGreek(isGreek);
  };

  const handleHighlight = (verseKey: string, color: string | null) => {
    notesService.setHighlight(verseKey, color);
    setHighlights(notesService.getHighlights());
  };

  const handleToggleBookmark = (verse: Verse) => {
    if (!selectedBook) return;
    const verseKey = `${selectedBook.id}.${selectedChapter}.${verse.v}`;
    notesService.toggleBookmark({
      verseKey,
      bookId: selectedBook.id,
      chapter: selectedChapter,
      verse: verse.v,
      referenceName: `${selectedBook.tagalog} ${selectedChapter}:${verse.v}`
    });
    setBookmarks(notesService.getBookmarks());
  };

  const handleSaveSettings = (newSettings: Partial<UserSettings>) => {
    const updated = notesService.saveSettings(newSettings);
    setSettings(updated);
  };

  // Quick cycle theme
  const handleCycleTheme = () => {
    const themes: Array<'obsidian' | 'parchment' | 'sapphire'> = ['obsidian', 'parchment', 'sapphire'];
    const currentIndex = themes.indexOf(settings.theme as any);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    handleSaveSettings({ theme: nextTheme });
  };

  const currentVerseKey = selectedBook && selectedVerse ? `${selectedBook.id}.${selectedChapter}.${selectedVerse.v}` : '';
  const currentLang: AppLanguage = settings.appLanguage || 'tl';
  const t = translations[currentLang] || translations.tl;

  return (
    <div className="app-container" data-theme={settings.theme}>
      {/* Top Application Navigation */}
      <header className="top-nav">
        <div className="nav-left">
          {/* Hamburger Menu (Bible Books & Chapters) */}
          <button
            className={`action-icon-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(prev => !prev)}
            title={sidebarOpen ? t.close : t.toggleSidebar}
          >
            <Menu size={20} />
          </button>

          {/* DEDICATED NOTES BUTTON RIGHT NEXT TO THE THREE LINES (☰) */}
          <button
            className={`action-icon-btn ${notesDrawerOpen ? 'active' : ''}`}
            onClick={() => setNotesDrawerOpen(prev => !prev)}
            title={currentLang === 'en' ? 'Study Notes, Bookmarks & Highlights' : 'Mga Tala, Bookmark, at Highlight'}
            style={{
              background: notesDrawerOpen ? 'var(--accent-gold-glow)' : 'transparent',
              color: notesDrawerOpen ? 'var(--accent-gold)' : 'var(--text-secondary)'
            }}
          >
            <BookMarked size={19} />
          </button>

          <div className="app-logo" onClick={() => setSidebarOpen(prev => !prev)}>
            <div className="app-logo-icon">
              <BookOpen size={24} />
            </div>
            <span className="app-title">{t.appTitle}</span>
            <span className="app-badge">{t.badge}</span>
          </div>
        </div>

        {/* Global Search Trigger */}
        <div className="nav-center">
          <button className="search-trigger-btn" onClick={() => setSearchModalOpen(true)}>
            <Search size={15} />
            <span>
              {t.searchPlaceholder}
            </span>
            <span className="search-shortcut">Ctrl+K</span>
          </button>
        </div>

        <div className="nav-right">
          {/* Active Passage Quick Badge */}
          {selectedBook && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--accent-gold)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Compass size={14} />
              <span>{currentLang === 'en' ? selectedBook.name : selectedBook.tagalog} {selectedChapter}</span>
            </button>
          )}

          {/* Quick Theme Cycle Button */}
          <button
            className="action-icon-btn"
            onClick={handleCycleTheme}
            title={`${t.cycleTheme} (${settings.theme})`}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--accent-gold)'
            }}
          >
            <Palette size={18} />
          </button>

          {/* Toggle Inspector Panel (Brain Symbol - AI & Logic ONLY) */}
          <button
            className={`action-icon-btn ${inspectorOpen ? 'active' : ''}`}
            onClick={() => setInspectorOpen(prev => !prev)}
            title={t.toggleInspector}
            style={{
              background: inspectorOpen ? 'var(--accent-gold-glow)' : 'transparent',
              color: inspectorOpen ? 'var(--accent-gold)' : 'var(--text-secondary)'
            }}
          >
            <Brain size={20} />
          </button>

          {/* Settings Button */}
          <button
            className="action-icon-btn"
            onClick={() => setSettingsModalOpen(true)}
            title={t.settings}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="main-layout">
        {/* Left Navigation Sidebar (Books & Chapters) */}
        <NavigationSidebar
          books={books}
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          isOpen={sidebarOpen}
          lang={currentLang}
          onSelectPassage={handleSelectPassage}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Dedicated Left Journal Drawer (Notes, Bookmarks, Highlights) */}
        <NotesDrawer
          isOpen={notesDrawerOpen}
          onClose={() => setNotesDrawerOpen(false)}
          books={books}
          currentBook={selectedBook}
          currentChapter={selectedChapter}
          currentVerse={selectedVerse}
          lang={currentLang}
          highlights={highlights}
          bookmarks={bookmarks}
          onNavigateToVerse={handleSelectPassage}
          onSetHighlight={handleHighlight}
          onToggleBookmark={handleToggleBookmark}
        />

        {/* Center Scripture Reader */}
        {selectedBook && (
          <ReaderPanel
            book={selectedBook}
            chapter={selectedChapter}
            verses={verses}
            selectedVerse={selectedVerse}
            highlights={highlights}
            isBookmarked={notesService.isBookmarked(currentVerseKey)}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            lang={currentLang}
            onSelectVerse={(v) => {
              setSelectedVerse(v);
            }}
            onOpenStrongs={handleOpenStrongs}
            onOpenCrossRefs={(v) => {
              setSelectedVerse(v);
              setCrossRefVerse(v);
            }}
            onOpenNotes={(v) => {
              setSelectedVerse(v);
              setNotesDrawerOpen(true);
            }}
            onOpenLogic={(v) => {
              setSelectedVerse(v);
              setInspectorOpen(true);
            }}
            onSetHighlight={handleHighlight}
            onToggleBookmark={handleToggleBookmark}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
          />
        )}

        {/* Right Inspector Drawer (EXCLUSIVELY FOR AI, LOGIC, SYLLOGISMS & EXEGESIS) */}
        {selectedBook && (
          <aside className={`inspector-panel ${inspectorOpen ? 'open' : 'collapsed'}`}>
            <div className="inspector-single-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} style={{ color: 'var(--accent-gold)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-gold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t.tabLogic}
                </span>
              </div>
              <button 
                className="action-icon-btn" 
                onClick={() => setInspectorOpen(false)}
                title={t.close}
                style={{ width: '24px', height: '24px' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Logic & Exegesis Body */}
            <div className="inspector-content">
              <LogicInspector
                book={selectedBook}
                chapter={selectedChapter}
                verse={selectedVerse}
                geminiApiKey={settings.geminiApiKey}
                lang={currentLang}
                onOpenSettings={() => setSettingsModalOpen(true)}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Floating Modals */}
      <StrongsModal
        strongsKey={strongsKey}
        isGreekHint={isStrongsGreek}
        onClose={() => setStrongsKey(null)}
      />

      {crossRefVerse && selectedBook && (
        <CrossRefDrawer
          currentVerseRef={`${currentLang === 'en' ? selectedBook.name : selectedBook.tagalog} ${selectedChapter}:${crossRefVerse.v}`}
          crossRefs={crossRefVerse.refs}
          books={books}
          isOpen={!!crossRefVerse}
          onClose={() => setCrossRefVerse(null)}
          onNavigateToRef={handleSelectPassage}
        />
      )}

      <SearchModal
        books={books}
        isOpen={searchModalOpen}
        initialLanguage={settings.searchLanguage}
        lang={currentLang}
        onClose={() => setSearchModalOpen(false)}
        onSelectVerse={handleSelectPassage}
      />

      <SettingsModal
        settings={settings}
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSaveSettings={handleSaveSettings}
      />

      {/* Mobile / Android Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenBooks={() => setSidebarOpen(prev => !prev)}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenNotes={() => setNotesDrawerOpen(prev => !prev)}
        onOpenLogic={() => setInspectorOpen(prev => !prev)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        lang={currentLang}
        isNotesOpen={notesDrawerOpen}
        isLogicOpen={inspectorOpen}
      />
    </div>
  );
};
