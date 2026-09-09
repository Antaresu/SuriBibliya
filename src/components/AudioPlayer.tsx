import React, { useState, useEffect, useRef } from 'react';
import { Verse, BookMetadata } from '../types/bible';
import { Volume2, Play, Pause, Square, ChevronDown } from 'lucide-react';
import { translations, AppLanguage } from '../services/i18n';

interface AudioPlayerProps {
  book: BookMetadata;
  chapter: number;
  verses: Verse[];
  activeVerseIndex: number;
  lang?: AppLanguage;
  onVerseChange: (index: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  book,
  chapter,
  verses,
  activeVerseIndex,
  lang = 'tl',
  onVerseChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('filipino-natural');
  const [showVoiceMenu, setShowVoiceMenu] = useState<boolean>(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceMenuRef = useRef<HTMLDivElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const activeChunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const currentVerseIdxRef = useRef<number>(activeVerseIndex);

  currentVerseIdxRef.current = activeVerseIndex;

  const t = translations[lang] || translations.tl;

  // Dismiss voice dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target as Node)) {
        setShowVoiceMenu(false);
      }
    };
    if (showVoiceMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showVoiceMenu]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const updateVoices = () => {
        if (!synthRef.current) return;
        const voices = synthRef.current.getVoices();
        setAvailableVoices(voices);
      };

      updateVoices();
      synthRef.current.onvoiceschanged = updateVoices;
    }

    return () => {
      stopAllAudio();
    };
  }, []);

  // Stop when chapter or book changes
  useEffect(() => {
    stopAllAudio();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, [book.id, chapter]);

  const stopAllAudio = () => {
    isPlayingRef.current = false;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.removeAttribute('src');
      currentAudioRef.current.load();
      currentAudioRef.current = null;
    }

    if (synthRef.current) {
      synthRef.current.cancel();
    }

    activeChunksRef.current = [];
    chunkIndexRef.current = 0;
  };

  // Helper to split text into digestible chunks for TTS streaming (max ~130 chars)
  const splitTextIntoChunks = (text: string, maxLen = 130): string[] => {
    const clean = text.replace(/<S>\d+<\/S>/g, '').trim();
    if (clean.length <= maxLen) return [clean];

    // Split on punctuation first
    const parts = clean.split(/([,;:.!?]+)/);
    const chunks: string[] = [];
    let current = '';

    for (let i = 0; i < parts.length; i += 2) {
      const sentence = (parts[i] || '') + (parts[i + 1] || '');
      if ((current + sentence).length <= maxLen) {
        current += sentence;
      } else {
        if (current.trim()) chunks.push(current.trim());
        // If single sentence is still larger than maxLen, split by spaces
        if (sentence.length > maxLen) {
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).length <= maxLen) {
              wordChunk += (wordChunk ? ' ' : '') + w;
            } else {
              if (wordChunk.trim()) chunks.push(wordChunk.trim());
              wordChunk = w;
            }
          }
          current = wordChunk;
        } else {
          current = sentence;
        }
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [clean];
  };

  // Play natural Filipino audio chunk via local Vite proxy /api/tts
  const playFilipinoChunk = (verseIdx: number) => {
    if (!isPlayingRef.current) return;

    if (chunkIndexRef.current >= activeChunksRef.current.length) {
      // Verse finished, move to next verse
      if (verseIdx + 1 < verses.length) {
        onVerseChange(verseIdx + 1);
        playVerse(verseIdx + 1);
      } else {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
      return;
    }

    const chunk = activeChunksRef.current[chunkIndexRef.current];
    const encoded = encodeURIComponent(chunk);
    const url = `/api/tts?text=${encoded}`;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
    }

    const audio = new Audio(url);
    audio.playbackRate = rate;
    currentAudioRef.current = audio;

    audio.onended = () => {
      if (!isPlayingRef.current) return;
      chunkIndexRef.current += 1;
      playFilipinoChunk(verseIdx);
    };

    audio.onerror = () => {
      if (!isPlayingRef.current) return;
      // Fallback to SpeechSynthesis if offline
      playViaSpeechSynth(verseIdx);
    };

    audio.play().catch(() => {
      if (!isPlayingRef.current) return;
      playViaSpeechSynth(verseIdx);
    });
  };

  // Fallback to SpeechSynthesis
  const playViaSpeechSynth = (index: number) => {
    if (!isPlayingRef.current || !synthRef.current || index >= verses.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    synthRef.current.cancel();
    const verseObj = verses[index];
    const textToSpeak = `Talata ${verseObj.v}. ${verseObj.adb}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = rate;

    const matched = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    if (matched) {
      utterance.voice = matched;
    } else {
      const filVoice = availableVoices.find(v => 
        v.lang.startsWith('fil') || v.lang.startsWith('tl') || v.name.toLowerCase().includes('filipino')
      );
      if (filVoice) utterance.voice = filVoice;
    }

    utterance.lang = 'fil-PH';

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      if (index + 1 < verses.length) {
        onVerseChange(index + 1);
        playVerse(index + 1);
      } else {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e: any) => {
      if (!isPlayingRef.current || e.error === 'canceled' || e.error === 'interrupted') {
        return;
      }
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    synthRef.current.speak(utterance);
  };

  const playVerse = (index: number) => {
    if (index >= verses.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    // Reset previous audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const verseObj = verses[index];

    if (selectedVoiceURI === 'filipino-natural') {
      const fullText = `Talata ${verseObj.v}. ${verseObj.adb}`;
      activeChunksRef.current = splitTextIntoChunks(fullText, 130);
      chunkIndexRef.current = 0;
      playFilipinoChunk(index);
    } else {
      playViaSpeechSynth(index);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      const startIdx = activeVerseIndex >= 0 ? activeVerseIndex : 0;
      playVerse(startIdx);
    }
  };

  const stop = () => {
    stopAllAudio();
    setIsPlaying(false);
  };

  // Label for active voice display
  const getSelectedVoiceName = () => {
    if (selectedVoiceURI === 'filipino-natural') {
      return '🇵🇭 Filipino Accent';
    }
    const found = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    if (found) {
      return found.name.split(' - ')[0].replace('Microsoft ', '').replace('Google ', '');
    }
    return t.voiceLabel;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'var(--bg-card)',
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--border-subtle)',
      fontSize: '0.8rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-gold)', fontWeight: 600 }}>
        <Volume2 size={15} />
        <span>{t.audioTitle}</span>
      </div>

      {/* Voice Selection Dropdown Trigger */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowVoiceMenu(!showVoiceMenu)}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            color: selectedVoiceURI === 'filipino-natural' ? '#10b981' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600
          }}
          title={getSelectedVoiceName()}
        >
          <span>{getSelectedVoiceName()}</span>
          <ChevronDown size={11} />
        </button>

        {showVoiceMenu && (
          <div 
            ref={voiceMenuRef}
            className="voice-menu-dropdown"
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-gold)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'Select Voice Accent:' : 'Pumili ng Boses / Accent:'}
            </div>

            {/* Featured Filipino Natural Voice */}
            <button
              onClick={() => {
                const wasPlaying = isPlaying;
                stopAllAudio();
                setSelectedVoiceURI('filipino-natural');
                setShowVoiceMenu(false);
                if (wasPlaying) {
                  playVerse(activeVerseIndex >= 0 ? activeVerseIndex : 0);
                }
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                background: selectedVoiceURI === 'filipino-natural' ? 'var(--accent-gold-glow)' : 'transparent',
                color: selectedVoiceURI === 'filipino-natural' ? 'var(--accent-gold)' : '#34d399',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>🇵🇭 Filipino (Tagalog Natural Audio)</div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                  {lang === 'en' ? 'Natural native Filipino accent (Recommended)' : 'Likas na puntong Filipino (Inirerekomenda)'}
                </div>
              </div>
            </button>

            {availableVoices.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0', paddingTop: '4px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '2px 8px' }}>
                  {lang === 'en' ? 'System Installed Voices:' : 'Mga Boses sa Sistema:'}
                </div>
                {availableVoices.map(v => {
                  const isFil = v.lang.startsWith('fil') || v.lang.startsWith('tl') || v.name.toLowerCase().includes('filipino') || v.name.toLowerCase().includes('tagalog');
                  const isSelected = v.voiceURI === selectedVoiceURI;
                  return (
                    <button
                      key={v.voiceURI}
                      onClick={() => {
                        const wasPlaying = isPlaying;
                        stopAllAudio();
                        setSelectedVoiceURI(v.voiceURI);
                        setShowVoiceMenu(false);
                        if (wasPlaying) {
                          playVerse(activeVerseIndex >= 0 ? activeVerseIndex : 0);
                        }
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        background: isSelected ? 'var(--accent-gold-glow)' : 'transparent',
                        color: isSelected ? 'var(--accent-gold)' : (isFil ? '#34d399' : 'var(--text-primary)'),
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 500 }}>{v.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {v.lang} {isFil ? '• (Tagalog / Filipino)' : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="action-icon-btn"
        style={{ background: isPlaying ? 'var(--accent-gold)' : 'var(--bg-input)', color: isPlaying ? '#000' : 'var(--text-gold)' }}
        title={isPlaying ? t.pauseAudio : t.playChapter}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
      </button>

      {isPlaying && (
        <button onClick={stop} className="action-icon-btn" title={t.stopAudio}>
          <Square size={12} />
        </button>
      )}

      {/* Speed Rate Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {[0.8, 1.0, 1.25].map(r => (
          <button
            key={r}
            onClick={() => {
              setRate(r);
              if (currentAudioRef.current) {
                currentAudioRef.current.playbackRate = r;
              }
            }}
            style={{
              padding: '1px 5px',
              fontSize: '0.66rem',
              borderRadius: '4px',
              background: rate === r ? 'var(--accent-gold-glow)' : 'transparent',
              color: rate === r ? 'var(--accent-gold)' : 'var(--text-muted)',
              border: rate === r ? '1px solid var(--border-medium)' : 'none',
              cursor: 'pointer'
            }}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
};
