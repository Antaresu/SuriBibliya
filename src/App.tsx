import React, { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
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
  Search, 
  Brain, 
  Edit3, 
  Settings, 
  Menu, 
  Bookmark as BookmarkIcon, 
  Compass,
  Palette,
  BookMarked,
  X,
  ChevronLeft
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
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });
  const [strongsKey, setStrongsKey] = useState<string | null>(null);
  const [isStrongsGreek, setIsStrongsGreek] = useState<boolean>(true);
  const [crossRefVerse, setCrossRefVerse] = useState<Verse | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [isComposingNote, setIsComposingNote] = useState<boolean>(false);
  const [backToastMessage, setBackToastMessage] = useState<string | null>(null);
  const lastBackPressRef = useRef<number>(0);

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

  // Load verses when book or chapter changes (Fix: do NOT auto-select verse 1 so it doesn't look highlighted)
  useEffect(() => {
    if (!selectedBook) return;
    bibleService.getBookData(selectedBook.id).then(data => {
      if (data && data.chapters[String(selectedChapter)]) {
        const chVerses = data.chapters[String(selectedChapter)];
        setVerses(chVerses);
        setSelectedVerse(null);
      }
    });
  }, [selectedBook?.id, selectedChapter]);

  // Android Hardware & Gesture Back Button Handling
  useEffect(() => {
    let backListener: any = null;

    const registerBack = async () => {
      try {
        backListener = await CapacitorApp.addListener('backButton', () => {
          // 1. Close any open modals or drawers and return to Home (Bible reader)
          if (settingsModalOpen) {
            setSettingsModalOpen(false);
            return;
          }
          if (searchModalOpen) {
            setSearchModalOpen(false);
            return;
          }
          if (strongsKey) {
            setStrongsKey(null);
            return;
          }
          if (crossRefVerse) {
            setCrossRefVerse(null);
            return;
          }
          if (notesDrawerOpen) {
            setNotesDrawerOpen(false);
            return;
          }
          if (sidebarOpen) {
            setSidebarOpen(false);
            return;
          }
          if (typeof window !== 'undefined' && window.innerWidth < 1024 && inspectorOpen) {
            setInspectorOpen(false);
            return;
          }

          // 2. If multi-select is active in Scripture reader, cancel selection
          const cancelMultiSelectBtn = document.getElementById('cancel-multi-select-btn');
          if (cancelMultiSelectBtn) {
            cancelMultiSelectBtn.click();
            return;
          }

          // 3. Already at Home (Scripture reader): Double tap back within 2s to exit app
          const now = Date.now();
          if (now - lastBackPressRef.current < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPressRef.current = now;
            const msg = (settings.appLanguage || 'tl') === 'en'
              ? 'Press back again to exit SuriBibliya'
              : 'Pindutin muli ang back upang lumabas sa SuriBibliya';
            setBackToastMessage(msg);
            setTimeout(() => setBackToastMessage(null), 2000);
          }
        });
      } catch {
        // Non-native web browser environment
      }
    };

    registerBack();

    return () => {
      if (backListener && backListener.remove) {
        backListener.remove();
      }
    };
  }, [
    settingsModalOpen,
    searchModalOpen,
    strongsKey,
    crossRefVerse,
    notesDrawerOpen,
    sidebarOpen,
    inspectorOpen,
    settings.appLanguage
  ]);

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
    // On mobile, close all drawers and return directly to reading verses!
    setSidebarOpen(false);
    setNotesDrawerOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setInspectorOpen(false);
    }
    setSettingsModalOpen(false);
    setSearchModalOpen(false);
    if (verseNum) {
      setTimeout(() => {
        const elem = document.getElementById(`verse-${verseNum}`);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          elem.classList.add('verse-pulse-highlight');
          setTimeout(() => elem.classList.remove('verse-pulse-highlight'), 3000);
        }
      }, 300);
    }
  };

  // Exclusive mobile navigation handlers ensuring ONLY ONE view is open at a time
  const handleNavBooks = () => {
    if (notesDrawerOpen || inspectorOpen || settingsModalOpen || searchModalOpen) {
      // Close all overlays and return straight to Scripture verses
      setNotesDrawerOpen(false);
      setInspectorOpen(false);
      setSettingsModalOpen(false);
      setSearchModalOpen(false);
      setSidebarOpen(false);
    } else {
      // Toggle book picker
      setSidebarOpen(prev => !prev);
    }
  };

  const handleNavSearch = () => {
    setSearchModalOpen(prev => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
        setNotesDrawerOpen(false);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setInspectorOpen(false);
        setSettingsModalOpen(false);
      }
      return next;
    });
  };

  const handleNavNotes = () => {
    setNotesDrawerOpen(prev => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setInspectorOpen(false);
        setSettingsModalOpen(false);
        setSearchModalOpen(false);
      }
      return next;
    });
  };

  const handleNavLogic = () => {
    setInspectorOpen(prev => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
        setNotesDrawerOpen(false);
        setSettingsModalOpen(false);
        setSearchModalOpen(false);
      }
      return next;
    });
  };

  const handleNavSettings = () => {
    setSettingsModalOpen(prev => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
        setNotesDrawerOpen(false);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) setInspectorOpen(false);
        setSearchModalOpen(false);
      }
      return next;
    });
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

  const handleDeleteBookmark = (verseKey: string) => {
    notesService.deleteBookmark(verseKey);
    setBookmarks(notesService.getBookmarks());
  };

  const handleReloadData = () => {
    setHighlights(notesService.getHighlights());
    setBookmarks(notesService.getBookmarks());
    setSettings(notesService.getSettings());
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
              <img src="/icon-192.png" alt="SuriBibliya" style={{ width: 30, height: 30, borderRadius: 8, display: 'block' }} />
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
          onDeleteBookmark={handleDeleteBookmark}
          onReloadData={handleReloadData}
          onComposingChange={setIsComposingNote}
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
              handleNavNotes();
            }}
            onOpenLogic={(v) => {
              setSelectedVerse(v);
              handleNavLogic();
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
              <button 
                type="button"
                className="modal-back-btn" 
                onClick={() => setInspectorOpen(false)}
                title={currentLang === 'en' ? 'Back to Bible reading' : 'Bumalik sa Pagbasa ng Bibliya'}
              >
                <ChevronLeft size={20} />
                <span>{currentLang === 'en' ? 'Back' : 'Bumalik'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} style={{ color: 'var(--accent-gold)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-gold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t.tabLogic}
                </span>
              </div>
              <button 
                type="button"
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

        {/* Mobile Backdrop for Drawers */}
        {(sidebarOpen || notesDrawerOpen || (inspectorOpen && typeof window !== 'undefined' && window.innerWidth < 1024)) && (
          <div 
            className="mobile-drawer-backdrop"
            onClick={() => {
              setSidebarOpen(false);
              setNotesDrawerOpen(false);
              setInspectorOpen(false);
            }}
          />
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
        onReloadData={handleReloadData}
      />

      {/* Mobile / Android Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenBooks={handleNavBooks}
        onOpenSearch={handleNavSearch}
        onOpenNotes={handleNavNotes}
        onOpenLogic={handleNavLogic}
        onOpenSettings={handleNavSettings}
        lang={currentLang}
        activeTab={
          settingsModalOpen ? 'settings' :
          notesDrawerOpen ? 'notes' :
          (inspectorOpen && typeof window !== 'undefined' && window.innerWidth < 1024) ? 'logic' :
          'bible'
        }
        isHidden={isComposingNote}
      />

      {/* Android Back Exit Confirmation Toast */}
      {backToastMessage && (
        <div className="back-exit-toast" role="alert">
          {backToastMessage}
        </div>
      )}
    </div>
  );
};
