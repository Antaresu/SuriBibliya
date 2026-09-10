import React, { useState, useEffect, useRef } from 'react';
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
  Highlighter,
  X,
  CheckSquare
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

  // Multi-verse selection state (triggered by holding / long-pressing a verse)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedVersesForAction, setSelectedVersesForAction] = useState<Set<number>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef<boolean>(false);

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

  // Extract Strong's numbers associated with a verse for ADB readers
  const extractStrongsFromVerse = (verse: Verse): string[] => {
    const combined = (verse.kjv || '') + ' ' + (verse.orig || '');
    const matches = Array.from(combined.matchAll(/<S>(\d+)<\/S>/g));
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const m of matches) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        unique.push(m[1]);
      }
    }
    return unique.slice(0, 10);
  };

  // Long-press / Hold handlers (triggers multi-select mode after ~420ms)
  const handlePointerDown = (verseNum: number) => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setIsMultiSelectMode(true);
      setSelectedVersesForAction(prev => {
        const next = new Set(prev);
        next.add(verseNum);
        return next;
      });
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(40); } catch { /* ignore */ }
      }
    }, 420);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Click on a verse row
  const handleVerseRowClick = (verse: Verse) => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }

    if (isMultiSelectMode) {
      setSelectedVersesForAction(prev => {
        const next = new Set(prev);
        if (next.has(verse.v)) {
          next.delete(verse.v);
          if (next.size === 0) {
            setIsMultiSelectMode(false);
          }
        } else {
          next.add(verse.v);
        }
        return next;
      });
      return;
    }

    // Normal mode: select verse
    onSelectVerse(verse);
  };

  // Highlight all currently selected verses in multi-select mode
  const handleHighlightAllSelected = (color: string | null) => {
    selectedVersesForAction.forEach(vNum => {
      const vKey = `${book.id}.${chapter}.${vNum}`;
      onSetHighlight(vKey, color);
    });
    setIsMultiSelectMode(false);
    setSelectedVersesForAction(new Set());
  };

  // Copy all currently selected verses
  const handleCopyAllSelected = () => {
    const sortedNums = Array.from(selectedVersesForAction).sort((a, b) => a - b);
    const bookTitle = lang === 'en' ? book.name : book.tagalog;
    const lines = sortedNums.map(num => {
      const vObj = verses.find(v => v.v === num);
      return vObj ? `${num}. ${vObj.adb}` : '';
    }).filter(Boolean);

    const fullText = `[${bookTitle} ${chapter}:${sortedNums.join(',')}]\n` + lines.join('\n');
    navigator.clipboard.writeText(fullText);
    setIsMultiSelectMode(false);
    setSelectedVersesForAction(new Set());
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
          {/* Audio Player with Multilingual Support */}
          <AudioPlayer
            book={book}
            chapter={chapter}
            verses={verses}
            activeVerseIndex={selectedVerse ? selectedVerse.v - 1 : 0}
            lang={lang}
            currentTranslation={viewMode === 'single' ? activeSingleTranslation : 'adb'}
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
        {/* Floating Top Action Bar for Multi-Verse Selection */}
        {isMultiSelectMode && (
          <div className="multi-select-floating-bar">
            <div className="multi-select-title-group">
              <CheckSquare size={16} />
              <span>
                {selectedVersesForAction.size} {lang === 'en' ? 'verses selected' : 'talata ang napili'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {lang === 'en' ? 'Highlight All:' : 'I-highlight Lahat:'}
              </span>
              {['amber', 'emerald', 'cyan', 'purple', 'rose'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleHighlightAllSelected(c)}
                  className="multi-select-color-btn"
                  style={{ background: `var(--hl-${c})` }}
                  title={`Color ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => handleHighlightAllSelected(null)}
                className="action-icon-btn"
                style={{ width: '24px', height: '24px' }}
                title={lang === 'en' ? 'Remove Highlights' : 'Alisin ang Highlight'}
              >
                <Highlighter size={13} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleCopyAllSelected}
                className="action-icon-btn"
                style={{ width: 'auto', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', gap: '4px' }}
                title="Copy selected verses"
              >
                <Copy size={13} />
                <span>{lang === 'en' ? 'Copy' : 'Kopyahin'}</span>
              </button>

              <button
                type="button"
                id="cancel-multi-select-btn"
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedVersesForAction(new Set());
                }}
                className="action-icon-btn"
                style={{ width: '26px', height: '26px' }}
                title={t.cancel}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {verses.map((verse) => {
          const verseKey = `${book.id}.${chapter}.${verse.v}`;
          const isSelected = selectedVerse?.v === verse.v;
          const isMultiSelected = selectedVersesForAction.has(verse.v);
          const highlight = highlights[verseKey];
          const highlightClass = highlight ? `highlight-${highlight.color}` : '';
          const isMenuOpen = activeMenuVerseNum === verse.v;
          const strongsForAdb = extractStrongsFromVerse(verse);

          return (
            <div
              key={verse.v}
              id={`verse-${verse.v}`}
              className={`verse-row ${isSelected && !isMultiSelectMode ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${highlightClass}`}
              onPointerDown={() => handlePointerDown(verse.v)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={() => handleVerseRowClick(verse)}
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
                  {activeSingleTranslation === 'adb' && (
                    <>
                      <span>{verse.adb}</span>
                      {showStrongs && strongsForAdb.length > 0 && (
                        <div className="adb-strongs-bar">
                          <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Strong's {isGreek ? 'Griyego' : 'Hebreo'}:
                          </span>
                          {strongsForAdb.map(sNum => (
                            <button
                              key={sNum}
                              type="button"
                              className="adb-strongs-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenStrongs(sNum, isGreek);
                              }}
                              title={`Strong's Lexicon (${isGreek ? 'G' : 'H'}${sNum})`}
                            >
                              <span>{isGreek ? 'G' : 'H'}{sNum}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
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
                  {/* Column 1: Ang Dating Biblia 1905 with Strong's tags chips */}
                  <div className="parallel-col">
                    <div className="col-tag">Ang Dating Biblia (1905)</div>
                    <div className="col-text">
                      <span className="verse-num-badge">{verse.v}</span>
                      {verse.adb}
                      {showStrongs && strongsForAdb.length > 0 && (
                        <div className="adb-strongs-bar">
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Strong's:
                          </span>
                          {strongsForAdb.slice(0, 6).map(sNum => (
                            <button
                              key={sNum}
                              type="button"
                              className="adb-strongs-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenStrongs(sNum, isGreek);
                              }}
                              title={`Strong's Lexicon (${isGreek ? 'G' : 'H'}${sNum})`}
                            >
                              <span>{isGreek ? 'G' : 'H'}{sNum}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
                      {showStrongs && strongsForAdb.length > 0 && (
                        <div className="adb-strongs-bar">
                          <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                            Kaugnay na Strong's:
                          </span>
                          {strongsForAdb.map(sNum => (
                            <button
                              key={sNum}
                              type="button"
                              className="adb-strongs-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenStrongs(sNum, isGreek);
                              }}
                              title={`Strong's Lexicon (${isGreek ? 'G' : 'H'}${sNum})`}
                            >
                              <span>{isGreek ? 'G' : 'H'}{sNum}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
