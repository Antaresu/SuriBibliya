import React, { useState, useEffect } from 'react';
import { StudyNote, Verse, BookMetadata, Highlight, Bookmark } from '../types/bible';
import { notesService } from '../services/notesService';
import { bibleService } from '../services/bibleService';
import { 
  Edit3, 
  Trash2, 
  Download, 
  Bookmark as BookmarkIcon, 
  Highlighter, 
  X, 
  ExternalLink, 
  Plus,
  Maximize2,
  Minimize2,
  Search,
  BookOpen,
  ArrowRight,
  Quote
} from 'lucide-react';
import { translations, AppLanguage } from '../services/i18n';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookMetadata[];
  currentBook: BookMetadata | null;
  currentChapter: number;
  currentVerse: Verse | null;
  lang?: AppLanguage;
  highlights: Record<string, Highlight>;
  bookmarks: Bookmark[];
  onNavigateToVerse: (book: BookMetadata, chapter: number, verseNum?: number) => void;
  onSetHighlight: (verseKey: string, color: string | null) => void;
  onToggleBookmark: (verse: Verse) => void;
}

interface DetectedVerse {
  raw: string;
  book: BookMetadata;
  chapter: number;
  verse?: number;
  textSnippet?: string;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  books,
  currentBook,
  currentChapter,
  currentVerse,
  lang = 'tl',
  highlights,
  bookmarks,
  onNavigateToVerse,
  onSetHighlight,
  onToggleBookmark
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks' | 'highlights'>('notes');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  
  // Note Editor State
  const [isComposing, setIsComposing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState(''); // Always empty for writer to decide
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('Pangkalahatan');
  const [noteColor, setNoteColor] = useState('amber');
  
  // Detected verse in current writing (strictly ISA LANG, appears only when chapter:verse is complete)
  const [detectedVerse, setDetectedVerse] = useState<DetectedVerse | null>(null);
  
  const [copiedExport, setCopiedExport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cache of verse snippets for highlights
  const [highlightSnippets, setHighlightSnippets] = useState<Record<string, { tagalog: string; english: string; book: BookMetadata; chapter: number; verse: number }>>({});

  const t = translations[lang] || translations.tl;

  useEffect(() => {
    loadNotes();
  }, [isOpen]);

  const loadNotes = () => {
    const allNotes = notesService.getNotes();
    setNotes(allNotes);
  };

  // Real-time verse reference detector: strictly tracks what the writer is typing
  // HINDI lalabas hangga't walang numero (kailangan may chapter:verse tulad ng Juan 1:1)
  // Pag inalis ang talata, agad na mawawala ang kahon sa ibaba.
  // At dito ISA LANG ang lumalabas, hindi nagpapatong-patong.
  useEffect(() => {
    if (!isComposing) {
      setDetectedVerse(null);
      return;
    }

    const fullText = `${noteTitle} ${noteContent}`;
    // Require complete reference with chapter and verse (e.g. Juan 1:1, Roma 8:28, Awit 23:1)
    const verseRegex = /(?:(?:\d\s*)?[A-Za-zÀ-ÿ]+)\s+\d+:\d+(?:-\d+)?/g;
    const textMatches = fullText.match(verseRegex);

    // If no complete reference with chapter:verse exists, hide the box immediately!
    if (!textMatches || textMatches.length === 0) {
      setDetectedVerse(null);
      return;
    }

    // Dito ISA LANG: Kunin ang pinakabagong / huling naisulat na talata
    const targetRef = textMatches[textMatches.length - 1].trim();

    let isCancelled = false;
    const checkMatch = async () => {
      const parsed = bibleService.parseReference(targetRef, books);
      if (!parsed) {
        if (!isCancelled) setDetectedVerse(null);
        return;
      }

      let textSnippet = '';
      if (currentVerse && currentBook && parsed.book.id === currentBook.id && parsed.chapter === currentChapter && parsed.verse === currentVerse.v) {
        textSnippet = currentVerse.adb;
      } else {
        const bookData = await bibleService.getBookData(parsed.book.id);
        if (bookData && bookData.chapters[String(parsed.chapter)]) {
          const vIndex = parsed.verse ? parsed.verse - 1 : 0;
          const vObj = bookData.chapters[String(parsed.chapter)][vIndex];
          if (vObj) {
            textSnippet = vObj.adb;
          }
        }
      }

      if (!isCancelled) {
        setDetectedVerse({
          raw: targetRef,
          book: parsed.book,
          chapter: parsed.chapter,
          verse: parsed.verse,
          textSnippet
        });
      }
    };

    checkMatch();

    return () => {
      isCancelled = true;
    };
  }, [noteTitle, noteContent, isComposing, books]);

  // Load verse texts for highlights tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'highlights') return;

    const loadHighlightTexts = async () => {
      const keys = Object.keys(highlights);
      const snippets: Record<string, { tagalog: string; english: string; book: BookMetadata; chapter: number; verse: number }> = {};

      for (const key of keys) {
        const parts = key.split('.');
        if (parts.length === 3) {
          const bId = parseInt(parts[0]);
          const ch = parseInt(parts[1]);
          const vNum = parseInt(parts[2]);
          const targetBook = books.find(b => b.id === bId);

          if (targetBook) {
            const data = await bibleService.getBookData(bId);
            if (data && data.chapters[String(ch)]) {
              const vObj = data.chapters[String(ch)].find(v => v.v === vNum);
              if (vObj) {
                snippets[key] = {
                  tagalog: vObj.adb,
                  english: vObj.kjv.replace(/<S>\d+<\/S>/g, '').trim(),
                  book: targetBook,
                  chapter: ch,
                  verse: vNum
                };
              }
            }
          }
        }
      }
      setHighlightSnippets(snippets);
    };

    loadHighlightTexts();
  }, [isOpen, activeTab, highlights, books]);

  const handleStartCreate = () => {
    setEditingNoteId(null);
    setNoteTitle(''); // Title stays empty for the writer to decide
    setNoteContent('');
    setNoteTags(lang === 'en' ? 'Reflection' : 'Pagninilay');
    setNoteColor('amber');
    setIsComposing(true);
  };

  const handleEditNote = (note: StudyNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || '');
    setNoteContent(note.content);
    setNoteTags(note.tags.join(', '));
    setNoteColor(note.color || 'amber');
    setIsComposing(true);
  };

  const handleSaveNote = () => {
    if (!noteContent.trim() && !noteTitle.trim()) return;

    const tagsArray = noteTags.split(',').map(item => item.trim()).filter(Boolean);
    const bId = detectedVerse ? detectedVerse.book.id : (currentBook ? currentBook.id : 43);
    const ch = detectedVerse ? detectedVerse.chapter : (currentChapter || 1);
    const v = detectedVerse?.verse ? detectedVerse.verse : (currentVerse ? currentVerse.v : 1);
    const detectedRefName = detectedVerse 
      ? `${lang === 'en' ? detectedVerse.book.name : detectedVerse.book.tagalog} ${detectedVerse.chapter}${detectedVerse.verse ? ':' + detectedVerse.verse : ''}`
      : (currentBook ? `${lang === 'en' ? currentBook.name : currentBook.tagalog} ${ch}:${v}` : 'General');

    // Store detected verse snippet if available
    const primarySnippet = detectedVerse?.textSnippet || (currentVerse ? currentVerse.adb : undefined);

    notesService.saveNote({
      id: editingNoteId || undefined,
      title: noteTitle.trim(),
      verseKey: `${bId}.${ch}.${v}`,
      bookId: bId,
      chapter: ch,
      verse: v,
      referenceName: detectedRefName,
      content: noteContent.trim(),
      verseSnippet: primarySnippet,
      tags: tagsArray.length > 0 ? tagsArray : ['Pagninilay'],
      color: noteColor
    });

    loadNotes();
    setIsComposing(false);
    setIsMaximized(false);
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm(t.deleteConfirm)) {
      notesService.deleteNote(id);
      loadNotes();
      if (editingNoteId === id) {
        setIsComposing(false);
      }
    }
  };

  const handleClearAllNotes = () => {
    if (confirm(lang === 'en' ? 'Are you sure you want to delete all saved notes?' : 'Sigurado ka bang nais mong burahin ang lahat ng na-save na tala?')) {
      notesService.clearAllNotes();
      loadNotes();
      setIsComposing(false);
    }
  };

  // Insert verse text snippet directly into the writer's note content: MAUUNA ANG VERSE, THEN ANG LAMAN!
  const handleInsertVerseText = (dv: DetectedVerse) => {
    if (!dv.textSnippet) return;
    const bookTitle = lang === 'en' ? dv.book.name : dv.book.tagalog;
    const verseRef = `${bookTitle} ${dv.chapter}${dv.verse ? ':' + dv.verse : ''}`;
    
    // Check if the writer already typed the reference at the end of their text
    const trimmed = noteContent.trim();
    if (trimmed.toLowerCase().endsWith(verseRef.toLowerCase())) {
      // Verse reference was already typed, place the content directly below it
      setNoteContent(trimmed + `\n"${dv.textSnippet}"\n\n`);
    } else {
      // Mauuna ang verse, then ang laman sa ibaba!
      const prefix = trimmed ? '\n\n' : '';
      setNoteContent(trimmed + `${prefix}${verseRef}\n"${dv.textSnippet}"\n\n`);
    }
  };

  const handleExportMarkdown = () => {
    const md = notesService.exportNotesToMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SuriBibliya_Notes_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // Helper to parse scripture references in text and render them as interactive verse boxes
  const renderTextWithVerseBoxes = (text: string) => {
    if (!text) return null;
    const regex = /((?:(?:\d\s*)?[A-Za-zÀ-ÿ]+)\s+\d+(?::\d+(?:-\d+)?)?)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const parsed = bibleService.parseReference(part.trim(), books);
      if (parsed) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToVerse(parsed.book, parsed.chapter, parsed.verse);
            }}
            className="verse-clickable-box-btn"
            title={lang === 'en' ? `Jump to ${part}` : `Pumunta sa ${part}`}
          >
            <BookOpen size={13} className="text-gold" />
            <span>{part}</span>
            <ExternalLink size={11} style={{ opacity: 0.8 }} />
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  const highlightKeys = Object.keys(highlights);
  const filteredNotes = notes.filter(n => 
    !searchQuery || 
    (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    n.referenceName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <aside className="journal-drawer open">
        {/* Drawer Header */}
        <div className="journal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} className="text-gold" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-gold)', fontSize: '0.96rem' }}>
                {lang === 'en' ? 'Study Journal & Collections' : 'Talaarawan at Koleksyon'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {lang === 'en' ? 'Notes • Bookmarks • Highlights' : 'Mga Tala • Mga Bookmark • Mga Highlight'}
              </div>
            </div>
          </div>
          <button className="action-icon-btn" onClick={onClose} title={t.close}>
            <X size={18} />
          </button>
        </div>

        {/* 3 Category Tabs */}
        <div className="journal-tabs">
          <button
            className={`journal-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <Edit3 size={15} />
            <span>{t.tabNotes} ({notes.length})</span>
          </button>

          <button
            className={`journal-tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <BookmarkIcon size={15} />
            <span>{t.tabBookmarks} ({bookmarks.length})</span>
          </button>

          <button
            className={`journal-tab-btn ${activeTab === 'highlights' ? 'active' : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            <Highlighter size={15} />
            <span>Highlights ({highlightKeys.length})</span>
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="journal-content">
          {/* =========================================================
              TAB 1: NOTES (MGA TALA)
              ========================================================= */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Action Bar: Create Note Button & Export */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  onClick={handleStartCreate}
                  className="create-note-primary-btn"
                  title="Lumikha ng bagong tala"
                >
                  <Plus size={16} />
                  <span>{lang === 'en' ? 'Create Note' : 'Lumikha ng Tala'}</span>
                </button>

                <button
                  onClick={handleExportMarkdown}
                  className="action-icon-btn"
                  title="Export notes to Markdown file"
                  style={{ width: 'auto', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', gap: '4px', background: 'var(--bg-card)' }}
                >
                  <Download size={13} />
                  <span>{copiedExport ? t.exportedSuccess : t.exportMarkdown}</span>
                </button>
              </div>

              {/* In-Drawer Note Composer (When Composing and NOT Maximized) */}
              {isComposing && !isMaximized && (
                <div className="note-composer-card">
                  {/* Composer Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-gold)', fontSize: '0.9rem' }}>
                      <Edit3 size={16} />
                      <span>{editingNoteId ? (lang === 'en' ? 'Edit Note' : 'I-edit ang Tala') : (lang === 'en' ? 'New Study Note' : 'Bagong Tala')}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Maximize Button */}
                      <button
                        onClick={() => setIsMaximized(true)}
                        className="action-icon-btn"
                        title={lang === 'en' ? 'Maximize editor (write in wide screen)' : 'I-maximize (mas malaking espasyo sa pagsusulat)'}
                        style={{ width: '26px', height: '26px' }}
                      >
                        <Maximize2 size={14} />
                      </button>

                      <button
                        onClick={() => setIsComposing(false)}
                        className="action-icon-btn"
                        title={t.cancel}
                        style={{ width: '26px', height: '26px' }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title Field: Empty for writer to decide */}
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Title of your note...' : 'Pamagat ng tala...'}
                      value={noteTitle}
                      onChange={e => setNoteTitle(e.target.value)}
                      className="note-title-input"
                    />
                  </div>

                  {/* Free Writing Textarea */}
                  <textarea
                    placeholder={lang === 'en' ? 'Write freely here...' : 'Malayang magsulat dito...'}
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    rows={8}
                    className="note-content-textarea"
                  />

                  {/* Interactive Detected Verse Box (ISA LANG): Lalabas LAMANG kapag kumpleto ang numero tulad ng Juan 1:1, at mawawala pag inalis */}
                  {detectedVerse && (() => {
                    const dvKey = `${detectedVerse.book.id}.${detectedVerse.chapter}.${detectedVerse.verse || 1}`;
                    const hl = highlights[dvKey];
                    return (
                      <div 
                        className="detected-verses-container"
                        style={{
                          borderLeft: hl ? `4px solid var(--hl-${hl.color})` : undefined
                        }}
                      >
                        <div className="detected-verses-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={13} className="text-gold" />
                            <span style={{ fontWeight: 600 }}>{lang === 'en' ? 'Detected Bible Verse:' : 'Natukoy na mga Talata sa iyong isinulat:'}</span>
                          </div>

                          {/* Quick Highlight Options for the Verse */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <Highlighter size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                              Highlight:
                            </span>
                            {['amber', 'emerald', 'cyan', 'purple', 'rose'].map(c => {
                              const isSelected = hl?.color === c;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => onSetHighlight(dvKey, isSelected ? null : c)}
                                  title={`Highlight ${c}`}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: `var(--hl-${c})`,
                                    border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.25)' : 'none',
                                    boxShadow: isSelected ? '0 0 6px var(--accent-gold)' : 'none',
                                    transition: 'all 0.15s ease'
                                  }}
                                />
                              );
                            })}
                            {hl && (
                              <button
                                type="button"
                                onClick={() => onSetHighlight(dvKey, null)}
                                title="Alisin ang highlight"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.7rem',
                                  padding: '0 2px'
                                }}
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="detected-verse-card">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => onNavigateToVerse(detectedVerse.book, detectedVerse.chapter, detectedVerse.verse)}
                              className="verse-clickable-box-btn"
                              title={lang === 'en' ? `Jump to ${detectedVerse.book.name} ${detectedVerse.chapter}:${detectedVerse.verse}` : `Pumunta sa ${detectedVerse.book.tagalog} ${detectedVerse.chapter}:${detectedVerse.verse}`}
                            >
                              <BookOpen size={13} className="text-gold" />
                              <span>📖 {lang === 'en' ? detectedVerse.book.name : detectedVerse.book.tagalog} {detectedVerse.chapter}{detectedVerse.verse ? `:${detectedVerse.verse}` : ''}</span>
                              <ExternalLink size={11} style={{ opacity: 0.8 }} />
                            </button>

                            {detectedVerse.textSnippet && (
                              <button
                                onClick={() => handleInsertVerseText(detectedVerse)}
                                className="insert-verse-btn"
                                title="Isama ang laman ng talata sa tala"
                              >
                                <Plus size={11} />
                                <span>{lang === 'en' ? 'Insert verse text' : 'Isama ang laman ng talata'}</span>
                              </button>
                            )}
                          </div>

                          {detectedVerse.textSnippet && (
                            <div 
                              className="detected-verse-snippet"
                              style={{
                                background: hl ? `var(--hl-${hl.color})` : undefined,
                                color: hl ? '#fff' : undefined,
                                padding: hl ? '6px 10px' : undefined,
                                borderRadius: hl ? '4px' : undefined,
                                borderLeft: hl ? `3px solid var(--accent-gold)` : undefined
                              }}
                            >
                              "{detectedVerse.textSnippet}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tags and Color Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tags:</span>
                      <input
                        type="text"
                        placeholder="hal. Pananampalataya, Aral"
                        value={noteTags}
                        onChange={e => setNoteTags(e.target.value)}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '3px 8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.74rem',
                          width: '140px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {['amber', 'emerald', 'cyan', 'purple', 'rose'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNoteColor(c)}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: `var(--hl-${c})`,
                            border: noteColor === c ? '2px solid var(--accent-gold)' : '1px solid transparent',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                      <button
                        onClick={() => setIsComposing(false)}
                        className="testament-tab"
                        style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={handleSaveNote}
                        className="save-note-btn"
                      >
                        {t.saveNote}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search in Saved Notes */}
              {notes.length > 2 && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search your notes...' : 'Hanapin sa iyong mga tala...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px 6px 28px',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem'
                    }}
                  />
                  <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-muted)' }} />
                </div>
              )}

              {/* Saved Notes List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-gold)' }}>
                    {t.allSavedNotes} ({notes.length})
                  </div>
                  {notes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllNotes}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f43f5e',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px'
                      }}
                      title={lang === 'en' ? 'Delete all notes' : 'Burahin lahat ng tala'}
                    >
                      <Trash2 size={12} />
                      <span>{lang === 'en' ? 'Clear All' : 'Burahin Lahat'}</span>
                    </button>
                  )}
                </div>

                {filteredNotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {searchQuery ? (lang === 'en' ? 'No matching notes found.' : 'Walang nahanap na tugmang tala.') : t.noNotesYet}
                  </div>
                ) : (
                  filteredNotes.map(note => {
                    const targetBook = books.find(b => b.id === note.bookId);
                    return (
                      <div
                        key={note.id}
                        className="saved-note-item-card"
                        style={{
                          borderLeft: `4px solid var(--hl-${note.color || 'amber'})`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {note.title ? (
                              <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {renderTextWithVerseBoxes(note.title)}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (targetBook) onNavigateToVerse(targetBook, note.chapter, note.verse);
                                }}
                                className="verse-clickable-box-btn"
                                style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                              >
                                <BookOpen size={12} className="text-gold" />
                                <span>{note.referenceName}</span>
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              onClick={() => handleEditNote(note)}
                              className="action-icon-btn"
                              title={t.editNote}
                              style={{ width: '24px', height: '24px' }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="action-icon-btn"
                              title="Delete note"
                              style={{ width: '24px', height: '24px' }}
                            >
                              <Trash2 size={13} color="#f43f5e" />
                            </button>
                          </div>
                        </div>

                        {/* Note Content with Interactive Clickable Verse Boxes */}
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {renderTextWithVerseBoxes(note.content)}
                        </p>

                        {/* Attached verse snippet if available */}
                        {note.verseSnippet && !note.content.includes(note.verseSnippet) && (
                          <div className="detected-verse-snippet" style={{ margin: '4px 0' }}>
                            "{note.verseSnippet}"
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {note.tags.map((tagItem, idx) => (
                              <span key={idx} style={{ color: 'var(--text-secondary)' }}>#{tagItem}</span>
                            ))}
                          </div>
                          <span>{new Date(note.updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fil-PH')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: BOOKMARKS (MGA BOOKMARK)
              ========================================================= */}
          {activeTab === 'bookmarks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-gold)', marginBottom: '4px' }}>
                {t.bookmarksTitle} ({bookmarks.length})
              </div>

              {bookmarks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <BookmarkIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                  <div>{t.noBookmarksYet}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {lang === 'en' ? 'Click the three dots (⋮) on any verse to bookmark it.' : 'Pindutin ang tatlong tuldok (⋮) sa alinmang talata upang i-bookmark ito.'}
                  </div>
                </div>
              ) : (
                bookmarks.map(bm => {
                  const targetBook = books.find(b => b.id === bm.bookId);
                  return (
                    <div
                      key={bm.id}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (targetBook) onNavigateToVerse(targetBook, bm.chapter, bm.verse);
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookmarkIcon size={14} color="var(--accent-gold)" />
                          <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                            {bm.referenceName}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(bm.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fil-PH')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (targetBook) {
                              onToggleBookmark({ v: bm.verse } as any);
                            }
                          }}
                          title={lang === 'en' ? 'Remove Bookmark' : 'Alisin ang Bookmark'}
                          style={{ width: '24px', height: '24px' }}
                        >
                          <Trash2 size={13} color="#f43f5e" />
                        </button>
                        <ArrowRight size={14} color="var(--text-muted)" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* =========================================================
              TAB 3: HIGHLIGHTS (MGA NA-HIGHLIGHT & SAAN IYON)
              ========================================================= */}
          {activeTab === 'highlights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-gold)' }}>
                {lang === 'en' ? 'All Scripture Highlights' : 'Lahat ng Na-highlight na Talata'} ({highlightKeys.length})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {lang === 'en' ? 'Showing all verses highlighted across the Bible, their colors, location, and scripture text:' : 'Ipinapakita ang lahat ng talatang may kulay, lokasyon, at mismong teksto sa Kasulatan:'}
              </div>

              {highlightKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Highlighter size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                  <div>{lang === 'en' ? 'No highlighted verses yet.' : 'Wala pang na-highlight na talata.'}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {lang === 'en' ? 'Select any verse and click the color dots in the three dots (⋮) menu.' : 'Pumili ng talata at pindutin ang mga bilog na kulay sa tatlong tuldok (⋮) menu.'}
                  </div>
                </div>
              ) : (
                highlightKeys.map(key => {
                  const hl = highlights[key];
                  const snippet = highlightSnippets[key];
                  const parts = key.split('.');
                  const bId = parseInt(parts[0]);
                  const ch = parseInt(parts[1]);
                  const vNum = parseInt(parts[2]);
                  const targetBook = books.find(b => b.id === bId);

                  const refName = targetBook 
                    ? `${lang === 'en' ? targetBook.name : targetBook.tagalog} ${ch}:${vNum}`
                    : `Passage ${ch}:${vNum}`;
                  const testamentLabel = targetBook?.testament === 'NT' 
                    ? (lang === 'en' ? 'New Testament' : 'Bagong Tipan') 
                    : (lang === 'en' ? 'Old Testament' : 'Lumang Tipan');

                  return (
                    <div
                      key={key}
                      className="highlight-collection-card"
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `4px solid var(--hl-${hl.color})`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (targetBook) onNavigateToVerse(targetBook, ch, vNum);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: `var(--hl-${hl.color})`,
                            display: 'inline-block'
                          }} />
                          <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.92rem' }}>
                            {refName}
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {testamentLabel}
                          </span>
                        </div>

                        <button
                          className="action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetHighlight(key, null);
                          }}
                          title={lang === 'en' ? 'Remove Highlight' : 'Alisin ang Kulay'}
                          style={{ width: '22px', height: '22px' }}
                        >
                          <Trash2 size={13} color="#f43f5e" />
                        </button>
                      </div>

                      {snippet ? (
                        <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{snippet.tagalog}"
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {lang === 'en' ? 'Loading verse snippet...' : 'Ikinakarga ang teksto ng talata...'}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <span>{new Date(hl.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fil-PH')}</span>
                        <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>{lang === 'en' ? 'Jump to verse' : 'Puntahan ang talata'}</span>
                          <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================
          MAXIMIZED FULLSCREEN WRITING STUDIO (PWEDE I-MAXIMIZE)
          ========================================================= */}
      {isComposing && isMaximized && (
        <div className="journal-modal-overlay">
          <div className="journal-maximized-modal">
            {/* Maximized Header */}
            <div className="maximized-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} className="text-gold" />
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-gold)' }}>
                  {editingNoteId ? (lang === 'en' ? 'Edit Note' : 'I-edit ang Tala') : (lang === 'en' ? 'Full Study Studio' : 'Malawakang Sulatan ng Tala')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Minimize Button */}
                <button
                  onClick={() => setIsMaximized(false)}
                  className="action-icon-btn"
                  title="I-minimize sa drawer"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  onClick={() => {
                    setIsComposing(false);
                    setIsMaximized(false);
                  }}
                  className="action-icon-btn"
                  title={t.close}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Maximized Body */}
            <div className="maximized-body">
              {/* Title Field: Empty for writer to decide */}
              <input
                type="text"
                placeholder={lang === 'en' ? 'Title of your note...' : 'Pamagat ng tala...'}
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                className="note-title-input maximized"
              />

              {/* Free Writing Textarea */}
              <textarea
                placeholder={lang === 'en' ? 'Write freely your essays, study notes, or sermon preparations...' : 'Malayang magsulat ng iyong mga tala, pagninilay, o komentaryo dito...'}
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                className="note-content-textarea maximized"
              />

              {/* Detected Verse Box in Maximized View (ISA LANG) */}
              {detectedVerse && (() => {
                const dvKey = `${detectedVerse.book.id}.${detectedVerse.chapter}.${detectedVerse.verse || 1}`;
                const hl = highlights[dvKey];
                return (
                  <div 
                    className="detected-verses-container"
                    style={{
                      borderLeft: hl ? `4px solid var(--hl-${hl.color})` : undefined
                    }}
                  >
                    <div className="detected-verses-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={14} className="text-gold" />
                        <span style={{ fontWeight: 600 }}>{lang === 'en' ? 'Detected Bible Verse in your writing:' : 'Natukoy na mga Talata sa iyong isinulat:'}</span>
                      </div>

                      {/* Quick Highlight Options for the Verse */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Highlighter size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                          Highlight:
                        </span>
                        {['amber', 'emerald', 'cyan', 'purple', 'rose'].map(c => {
                          const isSelected = hl?.color === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => onSetHighlight(dvKey, isSelected ? null : c)}
                              title={`Highlight ${c}`}
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: `var(--hl-${c})`,
                                border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                                cursor: 'pointer',
                                transform: isSelected ? 'scale(1.25)' : 'none',
                                boxShadow: isSelected ? '0 0 8px var(--accent-gold)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            />
                          );
                        })}
                        {hl && (
                          <button
                            type="button"
                            onClick={() => onSetHighlight(dvKey, null)}
                            title="Alisin ang highlight"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              padding: '0 2px'
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="detected-verse-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            onNavigateToVerse(detectedVerse.book, detectedVerse.chapter, detectedVerse.verse);
                            setIsMaximized(false);
                          }}
                          className="verse-clickable-box-btn"
                          title={lang === 'en' ? `Jump to ${detectedVerse.book.name} ${detectedVerse.chapter}:${detectedVerse.verse}` : `Pumunta sa ${detectedVerse.book.tagalog} ${detectedVerse.chapter}:${detectedVerse.verse}`}
                        >
                          <BookOpen size={13} className="text-gold" />
                          <span>📖 {lang === 'en' ? detectedVerse.book.name : detectedVerse.book.tagalog} {detectedVerse.chapter}{detectedVerse.verse ? `:${detectedVerse.verse}` : ''}</span>
                          <ExternalLink size={11} style={{ opacity: 0.8 }} />
                        </button>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {detectedVerse.textSnippet && (
                            <button
                              onClick={() => handleInsertVerseText(detectedVerse)}
                              className="insert-verse-btn"
                              title="Isama ang laman ng talata sa tala"
                            >
                              <Plus size={11} />
                              <span>{lang === 'en' ? 'Insert verse text' : 'Isama ang laman ng talata'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onNavigateToVerse(detectedVerse.book, detectedVerse.chapter, detectedVerse.verse);
                              setIsMaximized(false);
                            }}
                            className="jump-verse-btn"
                            title="Puntahan ang talata"
                          >
                            <ExternalLink size={11} />
                            <span>{lang === 'en' ? 'Jump' : 'Puntahan'}</span>
                          </button>
                        </div>
                      </div>

                      {detectedVerse.textSnippet && (
                        <div 
                          className="detected-verse-snippet"
                          style={{
                            background: hl ? `var(--hl-${hl.color})` : undefined,
                            color: hl ? '#fff' : undefined,
                            padding: hl ? '6px 10px' : undefined,
                            borderRadius: hl ? '4px' : undefined,
                            borderLeft: hl ? '3px solid var(--accent-gold)' : undefined
                          }}
                        >
                          "{detectedVerse.textSnippet}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Footer / Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tags:</span>
                  <input
                    type="text"
                    placeholder="hal. Doktrina, Pananampalataya"
                    value={noteTags}
                    onChange={e => setNoteTags(e.target.value)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '5px 10px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      width: '200px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.colorLabel}</span>
                  {['amber', 'emerald', 'cyan', 'purple', 'rose'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNoteColor(c)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: `var(--hl-${c})`,
                        border: noteColor === c ? '2px solid var(--accent-gold)' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setIsComposing(false);
                      setIsMaximized(false);
                    }}
                    className="testament-tab"
                    style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="save-note-btn maximized"
                  >
                    {t.saveNote}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
