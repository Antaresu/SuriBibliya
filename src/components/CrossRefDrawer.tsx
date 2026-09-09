import React, { useEffect, useState } from 'react';
import { BookMetadata, CrossRefEntry } from '../types/bible';
import { bibleService } from '../services/bibleService';
import { GitCompare, X, ExternalLink, ArrowRight } from 'lucide-react';

interface CrossRefDrawerProps {
  currentVerseRef: string; // e.g. "Juan 1:1"
  crossRefs: CrossRefEntry[];
  books: BookMetadata[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRef: (book: BookMetadata, chapter: number, verse?: number) => void;
}

export const CrossRefDrawer: React.FC<CrossRefDrawerProps> = ({
  currentVerseRef,
  crossRefs,
  books,
  isOpen,
  onClose,
  onNavigateToRef
}) => {
  const [previews, setPreviews] = useState<Record<string, { tagalog: string; english: string }>>({});

  useEffect(() => {
    // Load verse text preview for each cross reference
    const loadPreviews = async () => {
      const newPreviews: Record<string, { tagalog: string; english: string }> = {};
      for (const ref of crossRefs.slice(0, 10)) {
        const parsed = bibleService.parseReference(bibleService.formatOsisReference(ref.to, books), books);
        if (parsed) {
          const bookData = await bibleService.getBookData(parsed.book.id);
          if (bookData && bookData.chapters[String(parsed.chapter)]) {
            const vIndex = parsed.verse ? parsed.verse - 1 : 0;
            const verseObj = bookData.chapters[String(parsed.chapter)][vIndex];
            if (verseObj) {
              newPreviews[ref.to] = {
                tagalog: verseObj.adb,
                english: verseObj.kjv.replace(/<S>\d+<\/S>/g, '').trim()
              };
            }
          }
        }
      }
      setPreviews(newPreviews);
    };

    if (isOpen && crossRefs.length > 0) {
      loadPreviews();
    }
  }, [isOpen, crossRefs, books]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <GitCompare size={20} className="text-gold" />
            <span>Treasury of Scripture Knowledge: {currentVerseRef}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Nasa ibaba ang mga kaugnay na talata sa buong Bibliya (Cross-References) na nagpapatibay, nagpapaliwanag, o nagpapatotoo sa talatang ito.
          </div>

          {crossRefs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Walang nakitang cross-references para sa talatang ito sa kasalukuyang database.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {crossRefs.map((item, idx) => {
                const formattedName = bibleService.formatOsisReference(item.to, books);
                const preview = previews[item.to];
                const parsed = bibleService.parseReference(formattedName, books);

                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                          {formattedName}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          {item.votes} kaugnayan
                        </span>
                      </div>

                      {parsed && (
                        <button
                          onClick={() => {
                            onNavigateToRef(parsed.book, parsed.chapter, parsed.verse);
                            onClose();
                          }}
                          className="action-icon-btn"
                          title="Pumunta sa talatang ito"
                          style={{ background: 'var(--bg-input)', width: 'auto', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', gap: '4px' }}
                        >
                          <span>Pumunta</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>

                    {preview ? (
                      <div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '4px' }}>
                          "{preview.tagalog}"
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          KJV: "{preview.english}"
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Ikinakarga ang teksto...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
