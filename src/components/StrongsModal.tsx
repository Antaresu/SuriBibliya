import React, { useEffect, useState } from 'react';
import { StrongsEntry } from '../types/bible';
import { bibleService } from '../services/bibleService';
import { X, BookOpen, Volume2, Sparkles } from 'lucide-react';

interface StrongsModalProps {
  strongsKey: string | null; // e.g. "G3056" or "H7225"
  isGreekHint?: boolean;
  onClose: () => void;
}

export const StrongsModal: React.FC<StrongsModalProps> = ({ strongsKey, isGreekHint, onClose }) => {
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!strongsKey) return;
    setLoading(true);
    bibleService.getStrongsEntry(strongsKey, isGreekHint)
      .then(res => {
        setEntry(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [strongsKey, isGreekHint]);

  if (!strongsKey) return null;

  const isGreek = strongsKey.toUpperCase().startsWith('G') || (isGreekHint && !strongsKey.toUpperCase().startsWith('H'));
  const cleanKey = strongsKey.toUpperCase().startsWith('G') || strongsKey.toUpperCase().startsWith('H') 
    ? strongsKey.toUpperCase() 
    : (isGreek ? 'G' : 'H') + strongsKey;

  const playPronunciation = () => {
    const textToSpeak = entry?.pron || entry?.xlit || entry?.lemma;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && textToSpeak) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = isGreek ? 'el-GR' : 'he-IL';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen size={20} className="text-gold" />
            <span>Strong's Lexicon: {cleanKey}</span>
            <span className="app-badge">{isGreek ? 'Koine Greek' : 'Biblical Hebrew'}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Kinukuha ang datos mula sa lexicon...
            </div>
          ) : entry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Word Card */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--border-medium)'
              }}>
                <div>
                  <div style={{
                    fontSize: isGreek ? '2.2rem' : '2.6rem',
                    fontFamily: isGreek ? 'var(--font-greek)' : 'var(--font-hebrew)',
                    color: 'var(--accent-gold)',
                    direction: isGreek ? 'ltr' : 'rtl',
                    lineHeight: 1.2
                  }}>
                    {entry.lemma}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Transliteration: <strong style={{ color: 'var(--text-primary)' }}>{entry.xlit}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bigkas (Pronunciation):</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <span style={{ fontStyle: 'italic', color: 'var(--text-gold)', fontWeight: 600 }}>
                      {entry.pron || entry.xlit || entry.lemma}
                    </span>
                    <button 
                      onClick={playPronunciation} 
                      className="action-icon-btn" 
                      title="Pakinggan ang bigkas"
                      style={{ background: 'var(--bg-card)' }}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Derivation / Root Word */}
              {entry.derivation && (
                <div style={{ fontSize: '0.85rem', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 600 }}>Pinagmulan (Derivation): </span>
                  <span style={{ color: 'var(--text-primary)' }}>{entry.derivation}</span>
                </div>
              )}

              {/* Strong's Definition */}
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-gold)', fontWeight: 700, marginBottom: '6px' }}>
                  Kahulugan ayon kay Strong:
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-input)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--accent-gold)'
                }}>
                  {entry.def}
                </div>
              </div>

              {/* KJV Translation Occurrences */}
              {entry.kjv && (
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                    Pagsasalin sa King James Version (KJV Usage):
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {entry.kjv}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Hindi nahanap ang datos para sa Strong's key: {cleanKey}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
