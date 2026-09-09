import React from 'react';
import { BookOpen, Search, Edit3, Brain, Settings } from 'lucide-react';
import { AppLanguage } from '../services/i18n';

interface MobileBottomNavProps {
  onOpenBooks: () => void;
  onOpenSearch: () => void;
  onOpenNotes: () => void;
  onOpenLogic: () => void;
  onOpenSettings: () => void;
  lang?: AppLanguage;
  activeTab: 'bible' | 'search' | 'notes' | 'logic' | 'settings';
  isHidden?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenBooks,
  onOpenSearch,
  onOpenNotes,
  onOpenLogic,
  onOpenSettings,
  lang = 'tl',
  activeTab,
  isHidden = false
}) => {
  if (isHidden) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      {/* 1. Books / Scripture Passage (Bibliya) */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'bible' ? 'active' : ''}`}
        onClick={onOpenBooks}
        title={lang === 'en' ? 'Bible Reading & Books' : 'Pagbasa ng Bibliya at Mga Aklat'}
      >
        <BookOpen size={20} />
        <span>{lang === 'en' ? 'Bible' : 'Bibliya'}</span>
      </button>

      {/* 2. Global Search (Hanap) */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'search' ? 'active' : ''}`}
        onClick={onOpenSearch}
        title={lang === 'en' ? 'Search Scripture' : 'Maghanap ng Talata'}
      >
        <Search size={20} />
        <span>{lang === 'en' ? 'Search' : 'Hanap'}</span>
      </button>

      {/* 3. Notes & Journal (Mga Tala) */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'notes' ? 'active' : ''}`}
        onClick={onOpenNotes}
        title={lang === 'en' ? 'Study Notes & Journal' : 'Mga Tala at Journal'}
      >
        <Edit3 size={20} />
        <span>{lang === 'en' ? 'Notes' : 'Mga Tala'}</span>
      </button>

      {/* 4. Logic & Exegesis Inspector (Lohika) */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'logic' ? 'active' : ''}`}
        onClick={onOpenLogic}
        title={lang === 'en' ? 'Logic & Exegesis' : 'Lohika at Suri'}
      >
        <Brain size={20} />
        <span>{lang === 'en' ? 'Logic' : 'Lohika'}</span>
      </button>

      {/* 5. Settings Modal (Setting) */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={onOpenSettings}
        title={lang === 'en' ? 'Settings' : 'Mga Setting'}
      >
        <Settings size={20} />
        <span>{lang === 'en' ? 'Settings' : 'Setting'}</span>
      </button>
    </nav>
  );
};
