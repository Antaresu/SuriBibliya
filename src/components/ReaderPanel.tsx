import React, { useState, useEffect } from 'react';
import { BookMetadata, Verse, ViewMode, ActiveTranslation, Highlight } from '../types/bible';
import { AudioPlayer } from './AudioPlayer';
import { translations, AppLanguage } from '../services/i18n';
import { 
  Columns3, 
  AlignLeft, 
  Rows3, 
  ChevronLeft, 
  ChevronRight, 
  Brain, 
  GitCompare, 
  Edit3, 
  Bookmark, 
  Copy, 
  Check, 
  MoreVertical,
  Highlighter
} from 'lucide-react';

interface ReaderPanelProps {
  book: BookMetadata;
  chapter: number;
  verses: Verse[];
  selectedVerse: Verse | null;
  highlights: Record<string, Highlight>;
  isBookmarked: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: 'serif' | 'sans';
  lang?: AppLanguage;
  onSelectVerse: (verse: Verse) => void;
  onOpenStrongs: (key: string, isGreek: boolean) => void;
  onOpenCrossRefs: (verse: Verse) => void;
  onOpenNotes: (verse: Verse) => void;
  onOpenLogic: (verse: Verse) => void;
  onSetHighlight: (verseKey: string, color: string | null) => void;
  onToggleBookmark: (verse: Verse) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}

export const ReaderPanel: React.FC<ReaderPanelProps> = ({
  book,
  chapter,
  verses,
  selectedVerse,
  highlights,
  fontSize,
  fontFamily,
  lang = 'tl',
  onSelectVerse,
  onOpenStrongs,
  onOpenCrossRefs,
  onOpenNotes,
  onOpenLogic,
  onSetHighlight,
  onToggleBookmark,
  onPrevChapter,
  onNextChapter
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('parallel');
  const [activeSingleTranslation, setActiveSingleTranslation] = useState<ActiveTranslation>('adb');
  const [showStrongs, setShowStrongs] = useState(true);
  const [copiedVerseIndex, setCopiedVerseIndex] = useState<number | null>(null);
  const [activeMenuVerseNum, setActiveMenuVerseNum] = useState<number | null>(null);

  const t = translations[lang] || translations.tl;
  const isGreek = book.testament === 'NT';

  // Close three dots menu when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuVerseNum(null);
    };
    if (activeMenuVerseNum !== null) {
      window.addEventListener('click', handleDocumentClick);
    }
    return () => window.removeEventListener('click', handleDocumentClick);
  }, [activeMenuVerseNum]);

  // Helper to parse `<S>1234</S>` into interactive tags in KJV, Greek, and Hebrew
  const renderTextWithStrongs = (text: string, isGreekOrHebrew: boolean) => {
    if (!text) return null;

    if (!showStrongs) {
      return text.replace(/<S>\d+<\/S>/g, '');
    }

    const parts = text.split(/(<S>\d+<\/S>)/g);
    return parts.map((part, index) => {
      const match = part.match(/<S>(\d+)<\/S>/);
      if (match) {
        const strongsNum = match[1];
        return (
          <span
            key={index}
            className="strongs-tag"
            onClick={(e) => {
              e.stopPropagation();
              onOpenStrongs(strongsNum, isGreek);
            }}
            title={`Strong's Lexicon (${isGreek ? 'G' : 'H'}${strongsNum})`}
          >
            {strongsNum}
          </span>
        );
      }
      return (
        <span 
          key={index}
          style={isGreekOrHebrew ? { cursor: 'pointer' } : undefined}
        >
          {part}
        </span>
      );
    });
  };

  const handleCopyVerse = (verse: Verse) => {
    const bookTitle = lang === 'en' ? book.name : book.tagalog;
    const text = `"${verse.adb}" (${bookTitle} ${chapter}:${verse.v})\nKJV: "${verse.kjv.replace(/<S>\d+<\/S>/g, '')}"\n${isGreek ? 'Greek' : 'Hebrew'}: "${verse.orig.replace(/<S>\d+<\/S>/g, '')}"`;
    navigator.clipboard.writeText(text);
    setCopiedVerseIndex(verse.v);
    setTimeout(() => setCopiedVerseIndex(null), 1500);
    setActiveMenuVerseNum(null);
  };

  const fontSizeStyle = {
    small: '0.95rem',
    medium: '1.08rem',
    large: '1.2rem',
    xlarge: '1.35rem'
  }[fontSize];

  return (
    <main className="reader-workspace">
      {/* Reader Control Header Bar */}
      <div className="reader-header-bar">
        <div className="current-passage-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onPrevChapter}
              disabled={chapter <= 1}
              className="action-icon-btn"
              title={t.prevChapter}
              style={{ opacity: chapter <= 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={18} />
            </button>

            <h1 className="passage-h1">
              {lang === 'en' ? book.name : book.tagalog} {chapter}
            </h1>

            <button
              onClick={onNextChapter}
              disabled={chapter >= book.chapters}
              className="action-icon-btn"
              title={t.nextChapter}
              style={{ opacity: chapter >= book.chapters ? 0.3 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <span className="passage-sub">
            {lang === 'en' ? book.tagalog : book.name} • {verses.length} {t.versesCount} • {book.category}
          </span>
        </div>

        <div className="reader-controls">
          {/* Audio Player */}
          <AudioPlayer
            book={book}
            chapter={chapter}
            verses={verses}
            activeVerseIndex={selectedVerse ? selectedVerse.v - 1 : 0}
            lang={lang}
            onVerseChange={(idx) => onSelectVerse(verses[idx])}
          />

          {/* View Mode Selector */}
          <div className="mode-toggle-group">
            <button
              className={`mode-btn ${viewMode === 'single' ? 'active' : ''}`}
              onClick={() => setViewMode('single')}
              title={t.viewSingle}
            >
              <AlignLeft size={14} />
              <span>{t.viewSingle}</span>
            </button>

            <button
              className={`mode-btn ${viewMode === 'parallel' ? 'active' : ''}`}
              onClick={() => setViewMode('parallel')}
              title={t.viewParallel}
            >
              <Columns3 size={14} />
              <span>{t.viewParallel}</span>
            </button>

            <button
              className={`mode-btn ${viewMode === 'interlinear' ? 'active' : ''}`}
              onClick={() => setViewMode('interlinear')}
              title={t.viewInterlinear}
            >
              <Rows3 size={14} />
              <span>{t.viewInterlinear}</span>
            </button>
          </div>

          {/* Single Mode Translation Selector */}
          {viewMode === 'single' && (
            <div className="mode-toggle-group">
              <button
                className={`mode-btn ${activeSingleTranslation === 'adb' ? 'active' : ''}`}
                onClick={() => setActiveSingleTranslation('adb')}
              >
                ADB
              </button>
              <button
                className={`mode-btn ${activeSingleTranslation === 'kjv' ? 'active' : ''}`}
                onClick={() => setActiveSingleTranslation('kjv')}
              >
                KJV
              </button>
              <button
                className={`mode-btn ${activeSingleTranslation === 'orig' ? 'active' : ''}`}
                onClick={() => setActiveSingleTranslation('orig')}
              >
                {isGreek ? 'Greek' : 'Hebrew'}
              </button>
            </div>
          )}

          {/* Strong's Numbers Toggle */}
          <button
            onClick={() => setShowStrongs(!showStrongs)}
            className={`action-icon-btn ${showStrongs ? 'active' : ''}`}
            style={{
              width: 'auto',
              padding: '4px 9px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              gap: '4px',
              border: '1px solid var(--border-subtle)',
              background: showStrongs ? 'var(--accent-gold-glow)' : 'transparent',
              color: showStrongs ? 'var(--accent-gold)' : 'var(--text-muted)'
            }}
            title={t.strongsToggle}
          >
            <span>{t.strongsToggle}</span>
          </button>
        </div>
      </div>

      {/* Verses Scroll Area */}
      <div 
        className="verses-scroll-area"
        style={{
          fontFamily: fontFamily === 'serif' ? 'var(--font-serif-reading)' : 'var(--font-sans)',
          fontSize: fontSizeStyle
        }}
      >
        {verses.map((verse) => {
          const verseKey = `${book.id}.${chapter}.${verse.v}`;
          const isSelected = selectedVerse?.v === verse.v;
          const highlight = highlights[verseKey];
          const highlightClass = highlight ? `highlight-${highlight.color}` : '';
          const isMenuOpen = activeMenuVerseNum === verse.v;

          return (
            <div
              key={verse.v}
              id={`verse-${verse.v}`}
              className={`verse-row ${isSelected ? 'selected' : ''} ${highlightClass}`}
              onClick={() => onSelectVerse(verse)}
            >
              {/* Three-Dots Menu Button */}
              <button
                type="button"
                className={`verse-more-btn ${isMenuOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuVerseNum(isMenuOpen ? null : verse.v);
                }}
                title={t.verseOptions}
              >
                <MoreVertical size={16} />
              </button>

              {/* Three-Dots Dropdown Menu */}
              {isMenuOpen && (
                <div 
                  className="verse-options-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Highlight Colors Row */}
                  <div style={{ padding: '4px 6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                      {t.highlightTitle}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {['amber', 'emerald', 'cyan', 'purple', 'rose'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            onSetHighlight(verseKey, highlight?.color === c ? null : c);
                            setActiveMenuVerseNum(null);
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: `var(--hl-${c})`,
                            border: highlight?.color === c ? '2px solid var(--accent-gold)' : '1px solid var(--border-medium)',
                            cursor: 'pointer'
                          }}
                          title={`Color ${c}`}
                        />
                      ))}
                      {highlight && (
                        <button
                          onClick={() => {
                            onSetHighlight(verseKey, null);
                            setActiveMenuVerseNum(null);
                          }}
                          className="action-icon-btn"
                          style={{ width: '22px', height: '22px' }}
                          title={t.removeHighlight}
                        >
                          <Highlighter size={12} color="var(--text-muted)" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add / Edit Note */}
                  <button
                    className="verse-option-item"
                    onClick={() => {
                      onOpenNotes(verse);
                      setActiveMenuVerseNum(null);
                    }}
                  >
                    <Edit3 size={15} color="var(--accent-gold)" />
                    <span>{t.addNote}</span>
                  </button>

                  {/* Cross References */}
                  <button
                    className="verse-option-item"
                    onClick={() => {
                      onOpenCrossRefs(verse);
                      setActiveMenuVerseNum(null);
                    }}
                  >
                    <GitCompare size={15} color="#38bdf8" />
                    <span>{t.viewCrossRefs} ({verse.refs.length})</span>
                  </button>

                  {/* Analyze Logic */}
                  <button
                    className="verse-option-item"
                    onClick={() => {
                      onOpenLogic(verse);
                      setActiveMenuVerseNum(null);
                    }}
                  >
                    <Brain size={15} color="#f59e0b" />
                    <span>{t.analyzeLogic}</span>
                  </button>

                  {/* Bookmark */}
                  <button
                    className="verse-option-item"
                    onClick={() => {
                      onToggleBookmark(verse);
                      setActiveMenuVerseNum(null);
                    }}
                  >
                    <Bookmark size={15} color="#10b981" />
                    <span>{t.bookmarkVerse}</span>
                  </button>

                  {/* Copy Verse */}
                  <button
                    className="verse-option-item"
                    onClick={() => handleCopyVerse(verse)}
                  >
                    {copiedVerseIndex === verse.v ? (
                      <>
                        <Check size={15} color="#10b981" />
                        <span style={{ color: '#10b981' }}>{t.copiedText}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} color="var(--text-secondary)" />
                        <span>{t.copyVerse}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* View Mode Renderers */}
              {viewMode === 'single' && (
                <div className="single-verse-text" style={{ paddingRight: '36px' }}>
                  <span className="verse-num-badge">{verse.v}</span>
                  {activeSingleTranslation === 'adb' && <span>{verse.adb}</span>}
                  {activeSingleTranslation === 'kjv' && <span>{renderTextWithStrongs(verse.kjv, false)}</span>}
                  {activeSingleTranslation === 'orig' && (
                    <span className={isGreek ? 'col-text greek' : 'col-text hebrew'}>
                      {renderTextWithStrongs(verse.orig, true)}
                    </span>
                  )}
                </div>
              )}

              {viewMode === 'parallel' && (
                <div className="parallel-verse-grid" style={{ paddingRight: '36px' }}>
                  {/* Column 1: Ang Dating Biblia 1905 */}
                  <div className="parallel-col">
                    <div className="col-tag">Ang Dating Biblia (1905)</div>
                    <div className="col-text">
                      <span className="verse-num-badge">{verse.v}</span>
                      {verse.adb}
                    </div>
                  </div>

                  {/* Column 2: King James Version with Strong's */}
                  <div className="parallel-col">
                    <div className="col-tag">King James Version (KJV)</div>
                    <div className="col-text">
                      <span className="verse-num-badge">{verse.v}</span>
                      {renderTextWithStrongs(verse.kjv, false)}
                    </div>
                  </div>

                  {/* Column 3: Original Language with Strong's */}
                  <div className="parallel-col">
                    <div className="col-tag" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{isGreek ? 'Textus Receptus (Greek NT)' : 'Westminster Leningrad Codex (Hebrew OT)'}</span>
                    </div>
                    <div className={`col-text ${isGreek ? 'greek' : 'hebrew'}`}>
                      <span className="verse-num-badge">{verse.v}</span>
                      {renderTextWithStrongs(verse.orig, true)}
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'interlinear' && (
                <div className="interlinear-row" style={{ paddingRight: '36px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="verse-num-badge" style={{ fontSize: '1rem' }}>{lang === 'en' ? 'Verse' : 'Talata'} {verse.v}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({lang === 'en' ? book.name : book.tagalog} {chapter}:{verse.v})
                    </span>
                  </div>

                  {/* ADB Box */}
                  <div className="interlinear-section">
                    <div className="interlinear-label">Ang Dating Biblia (Tagalog 1905):</div>
                    <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {verse.adb}
                    </div>
                  </div>

                  {/* KJV Box with Strong's */}
                  <div className="interlinear-section" style={{ borderLeftColor: '#38bdf8' }}>
                    <div className="interlinear-label" style={{ color: '#38bdf8' }}>King James Version with Strong's:</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {renderTextWithStrongs(verse.kjv, false)}
                    </div>
                  </div>

                  {/* Original Language Box with Strong's */}
                  <div className="interlinear-section" style={{ borderLeftColor: '#10b981' }}>
                    <div className="interlinear-label" style={{ color: '#10b981' }}>
                      {isGreek ? 'Original Greek (Textus Receptus)' : 'Original Hebrew (Westminster Leningrad Codex)'}:
                    </div>
                    <div className={isGreek ? 'col-text greek' : 'col-text hebrew'}>
                      {renderTextWithStrongs(verse.orig, true)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};
