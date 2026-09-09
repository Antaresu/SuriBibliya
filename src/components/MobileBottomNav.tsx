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
  isNotesOpen: boolean;
  isLogicOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenBooks,
  onOpenSearch,
  onOpenNotes,
  onOpenLogic,
  onOpenSettings,
  lang = 'tl',
  isNotesOpen,
  isLogicOpen
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      {/* 1. Books / Scripture Passage */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenBooks}
        title={lang === 'en' ? 'Books & Chapters' : 'Mga Aklat at Kabanata'}
      >
        <BookOpen size={20} />
        <span>{lang === 'en' ? 'Bible' : 'Bibliya'}</span>
      </button>

      {/* 2. Global Search */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenSearch}
        title={lang === 'en' ? 'Search Scripture' : 'Maghanap ng Talata'}
      >
        <Search size={20} />
        <span>{lang === 'en' ? 'Search' : 'Hanap'}</span>
      </button>

      {/* 3. Notes & Journal */}
      <button
        type="button"
        className={`mobile-nav-item ${isNotesOpen ? 'active' : ''}`}
        onClick={onOpenNotes}
        title={lang === 'en' ? 'Study Notes & Journal' : 'Mga Tala at Journal'}
      >
        <Edit3 size={20} />
        <span>{lang === 'en' ? 'Notes' : 'Mga Tala'}</span>
      </button>

      {/* 4. Logic & Exegesis Inspector (Brain) */}
      <button
        type="button"
        className={`mobile-nav-item ${isLogicOpen ? 'active' : ''}`}
        onClick={onOpenLogic}
        title={lang === 'en' ? 'Logic & Exegesis' : 'Lohika at Suri'}
      >
        <Brain size={20} />
        <span>{lang === 'en' ? 'Exegesis' : 'Lohika'}</span>
      </button>

      {/* 5. Settings Modal */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenSettings}
        title={lang === 'en' ? 'Settings' : 'Mga Setting'}
      >
        <Settings size={20} />
        <span>{lang === 'en' ? 'Settings' : 'Setting'}</span>
      </button>
    </nav>
  );
};
