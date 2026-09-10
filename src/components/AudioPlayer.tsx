import React, { useState, useEffect, useRef } from 'react';
import { Verse, BookMetadata } from '../types/bible';
import { Volume2, Play, Pause, Square, ChevronDown, SkipForward, SkipBack, Loader2 } from 'lucide-react';
import { translations, AppLanguage } from '../services/i18n';

interface AudioPlayerProps {
  book: BookMetadata;
  chapter: number;
  verses: Verse[];
  activeVerseIndex: number;
  lang?: AppLanguage;
  currentTranslation?: 'adb' | 'kjv' | 'orig';
  onVerseChange: (index: number) => void;
}

declare global {
  interface Window {
    __sbActiveUtterance?: SpeechSynthesisUtterance | null;
  }
}

interface LanguageVoiceOption {
  id: string;
  name: string;
  subtitle: string;
  flag: string;
  langPrefixes: string[];
  defaultLang: string;
}

const LANGUAGE_OPTIONS: LanguageVoiceOption[] = [
  { id: 'fil', name: 'Filipino / Tagalog', subtitle: 'Ang Dating Biblia (ADB)', flag: '🇵🇭', langPrefixes: ['fil', 'tl', 'tagalog'], defaultLang: 'tl-PH' },
  { id: 'en', name: 'English', subtitle: 'King James Version (KJV)', flag: '🇺🇸', langPrefixes: ['en'], defaultLang: 'en-US' },
  { id: 'zh', name: 'Chinese (中文)', subtitle: 'Mandarin Chinese Audio', flag: '🇨🇳', langPrefixes: ['zh', 'cmn', 'chinese'], defaultLang: 'zh-CN' },
  { id: 'ar', name: 'Arabic (العربية)', subtitle: 'Arabic Language Audio', flag: '🇸🇦', langPrefixes: ['ar', 'arabic'], defaultLang: 'ar-SA' },
  { id: 'es', name: 'Spanish (Español)', subtitle: 'Spanish Language Audio', flag: '🇪🇸', langPrefixes: ['es', 'spanish'], defaultLang: 'es-ES' },
  { id: 'el', name: 'Greek (Ελληνικά)', subtitle: 'Original Textus Receptus', flag: '🇬🇷', langPrefixes: ['el', 'grc', 'greek'], defaultLang: 'el-GR' },
  { id: 'he', name: 'Hebrew (עברית)', subtitle: 'Original Hebrew OT', flag: '🇮🇱', langPrefixes: ['he', 'iw', 'hebrew'], defaultLang: 'he-IL' }
];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  book,
  chapter,
  verses,
  activeVerseIndex,
  lang = 'tl',
  currentTranslation = 'adb',
  onVerseChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Default audio language: English for KJV, Filipino for ADB
  const defaultSelectedLang = currentTranslation === 'kjv' ? 'en' : 'fil';
  const [selectedLangId, setSelectedLangId] = useState<string>(defaultSelectedLang);
  const [selectedDeviceVoiceURI, setSelectedDeviceVoiceURI] = useState<string | null>(null);
  const [showVoiceMenu, setShowVoiceMenu] = useState<boolean>(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceMenuRef = useRef<HTMLDivElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentVerseIdxRef = useRef<number>(activeVerseIndex);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Preload system voices if supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const updateVoices = () => {
        if (!synthRef.current) return;
        try {
          const voices = synthRef.current.getVoices();
          if (voices && voices.length > 0) {
            setAvailableVoices(voices);
          }
        } catch {
          // ignore
        }
      };

      updateVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = updateVoices;
      }
      setTimeout(updateVoices, 500);
      setTimeout(updateVoices, 1500);
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
    setIsLoadingAudio(false);

    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.__sbActiveUtterance = null;
    }
  };

  // Find best matching voice for a language option
  const findMatchingVoice = (langOption: LanguageVoiceOption): SpeechSynthesisVoice | null => {
    if (!availableVoices.length) return null;
    
    // Exact or prefix match
    for (const prefix of langOption.langPrefixes) {
      const match = availableVoices.find(v => 
        v.lang.toLowerCase().startsWith(prefix) || 
        v.name.toLowerCase().includes(prefix)
      );
      if (match) return match;
    }
    return null;
  };

  // Get clean text to speak for the given verse
  const getVerseTextToSpeak = (verseObj: Verse, langId: string): string => {
    const cleanKjv = verseObj.kjv.replace(/<S>\d+<\/S>/g, '').trim();
    const cleanOrig = verseObj.orig.replace(/<S>\d+<\/S>/g, '').trim();

    switch (langId) {
      case 'fil':
        return `Talata ${verseObj.v}. ${verseObj.adb}`;
      case 'en':
        return `Verse ${verseObj.v}. ${cleanKjv}`;
      case 'el':
      case 'he':
        return cleanOrig || `Verse ${verseObj.v}. ${cleanKjv}`;
      case 'zh':
        // If reading in Chinese voice, speak verse reference and message
        return `第 ${verseObj.v} 节. ${cleanKjv}`;
      case 'ar':
        return `الآية ${verseObj.v}. ${cleanKjv}`;
      case 'es':
        return `Versículo ${verseObj.v}. ${cleanKjv}`;
      default:
        return `Talata ${verseObj.v}. ${verseObj.adb}`;
    }
  };

  // Play verse using Web Speech API with Android keep-alive
  const playVerse = (index: number) => {
    if (index < 0 || index >= verses.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoadingAudio(false);
      return;
    }

    if (!synthRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    if (!synthRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    // Cancel prior audio and clear timers
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    try {
      if (synthRef.current.paused) {
        synthRef.current.resume();
      }
      synthRef.current.cancel();
    } catch {
      // ignore
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsLoadingAudio(true);

    const verseObj = verses[index];
    const textToSpeak = getVerseTextToSpeak(verseObj, selectedLangId);
    const selectedOption = LANGUAGE_OPTIONS.find(o => o.id === selectedLangId) || LANGUAGE_OPTIONS[0];

    // Android Chrome WebView fix: slight timeout after cancel prevents immediate cancellation
    playTimeoutRef.current = setTimeout(() => {
      if (!isPlayingRef.current || !synthRef.current) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = rate;

      // Assign voice
      if (selectedDeviceVoiceURI) {
        const devVoice = availableVoices.find(v => v.voiceURI === selectedDeviceVoiceURI);
        if (devVoice) {
          utterance.voice = devVoice;
          utterance.lang = devVoice.lang;
        }
      } else {
        const matched = findMatchingVoice(selectedOption);
        if (matched) {
          utterance.voice = matched;
          utterance.lang = matched.lang;
        } else {
          utterance.lang = selectedOption.defaultLang;
        }
      }

      // Save global reference to prevent Android garbage collection
      if (typeof window !== 'undefined') {
        window.__sbActiveUtterance = utterance;
      }

      utterance.onstart = () => {
        setIsLoadingAudio(false);
        // Android keep-alive: pulse resume every 8s to prevent Chrome sleep bug
        if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = setInterval(() => {
          if (synthRef.current && isPlayingRef.current) {
            if (synthRef.current.speaking && !synthRef.current.paused) {
              synthRef.current.pause();
              synthRef.current.resume();
            }
          }
        }, 8000);
      };

      utterance.onend = () => {
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        if (!isPlayingRef.current) return;

        // Move to next verse automatically
        if (index + 1 < verses.length) {
          const nextIdx = index + 1;
          onVerseChange(nextIdx);
          playVerse(nextIdx);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      };

      utterance.onerror = (e: any) => {
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        setIsLoadingAudio(false);

        // Ignore user cancellation or intentional skip
        if (!isPlayingRef.current || e.error === 'canceled' || e.error === 'interrupted') {
          return;
        }

        // If specific language failed, retry with system default voice
        if (e.error === 'language-unavailable' || e.error === 'voice-unavailable') {
          try {
            const fallbackUtterance = new SpeechSynthesisUtterance(textToSpeak);
            fallbackUtterance.rate = rate;
            fallbackUtterance.onend = utterance.onend;
            if (typeof window !== 'undefined') window.__sbActiveUtterance = fallbackUtterance;
            synthRef.current?.speak(fallbackUtterance);
            return;
          } catch {
            // ignore
          }
        }

        isPlayingRef.current = false;
        setIsPlaying(false);
      };

      try {
        synthRef.current.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
        setIsPlaying(false);
        isPlayingRef.current = false;
        setIsLoadingAudio(false);
      }
    }, 45);
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

  const handleNextVerse = () => {
    const nextIdx = (activeVerseIndex >= 0 ? activeVerseIndex : 0) + 1;
    if (nextIdx < verses.length) {
      onVerseChange(nextIdx);
      if (isPlaying) {
        playVerse(nextIdx);
      }
    }
  };

  const handlePrevVerse = () => {
    const prevIdx = (activeVerseIndex >= 0 ? activeVerseIndex : 0) - 1;
    if (prevIdx >= 0) {
      onVerseChange(prevIdx);
      if (isPlaying) {
        playVerse(prevIdx);
      }
    }
  };

  const stop = () => {
    stopAllAudio();
    setIsPlaying(false);
  };

  // Get display name of chosen language or voice
  const getSelectedVoiceDisplayName = () => {
    if (selectedDeviceVoiceURI) {
      const found = availableVoices.find(v => v.voiceURI === selectedDeviceVoiceURI);
      if (found) {
        return found.name.split(' - ')[0].replace('Microsoft ', '').replace('Google ', '');
      }
    }
    const currentOpt = LANGUAGE_OPTIONS.find(o => o.id === selectedLangId);
    return currentOpt ? `${currentOpt.flag} ${currentOpt.name.split(' ')[0]}` : t.audioTitle;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'var(--bg-card)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--border-subtle)',
      fontSize: '0.8rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isPlaying ? '#10b981' : 'var(--text-gold)', fontWeight: 600 }}>
        {isLoadingAudio ? (
          <Loader2 size={15} className="search-spinner" />
        ) : (
          <Volume2 size={15} style={{ animation: isPlaying ? 'pulse 1.5s infinite' : 'none' }} />
        )}
        <span className="hide-on-mobile">{t.audioTitle}</span>
      </div>

      {/* Voice / Language Dropdown Trigger */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowVoiceMenu(!showVoiceMenu)}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            color: isPlaying ? '#10b981' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            maxWidth: '145px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600
          }}
          title={getSelectedVoiceDisplayName()}
        >
          <span>{getSelectedVoiceDisplayName()}</span>
          <ChevronDown size={11} />
        </button>

        {showVoiceMenu && (
          <div 
            ref={voiceMenuRef}
            className="voice-menu-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              padding: '6px',
              zIndex: 2000,
              minWidth: '240px',
              maxHeight: '340px',
              overflowY: 'auto'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-gold)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'Select Audio Language:' : 'Pumili ng Wika / Boses:'}
            </div>

            {/* Standard Languages (Filipino, English, Chinese, Arabic, Spanish, Greek, Hebrew) */}
            {LANGUAGE_OPTIONS.map(opt => {
              const isSelected = selectedLangId === opt.id && !selectedDeviceVoiceURI;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const wasPlaying = isPlaying;
                    stopAllAudio();
                    setSelectedLangId(opt.id);
                    setSelectedDeviceVoiceURI(null);
                    setShowVoiceMenu(false);
                    if (wasPlaying) {
                      playVerse(activeVerseIndex >= 0 ? activeVerseIndex : 0);
                    }
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    background: isSelected ? 'var(--accent-gold-glow)' : 'transparent',
                    color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{opt.flag} {opt.name}</div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{opt.subtitle}</div>
                  </div>
                  {isSelected && <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>✓</span>}
                </button>
              );
            })}

            {/* Device-installed system voices */}
            {availableVoices.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '6px 0 4px 0', paddingTop: '4px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '2px 8px' }}>
                  {lang === 'en' ? 'Device Offline Voices:' : 'Mga Boses sa Device:'}
                </div>
                {availableVoices.slice(0, 8).map(v => {
                  const isSelected = selectedDeviceVoiceURI === v.voiceURI;
                  return (
                    <button
                      key={v.voiceURI}
                      type="button"
                      onClick={() => {
                        const wasPlaying = isPlaying;
                        stopAllAudio();
                        setSelectedDeviceVoiceURI(v.voiceURI);
                        setShowVoiceMenu(false);
                        if (wasPlaying) {
                          playVerse(activeVerseIndex >= 0 ? activeVerseIndex : 0);
                        }
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '5px 8px',
                        background: isSelected ? 'var(--accent-gold-glow)' : 'transparent',
                        color: isSelected ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: isSelected ? 700 : 500 }}>{v.name.replace(/Microsoft |Google /g, '')}</span>
                        <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({v.lang})</span>
                      </div>
                      {isSelected && <span style={{ color: 'var(--accent-gold)' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verse navigation: Previous */}
      <button
        type="button"
        onClick={handlePrevVerse}
        className="action-icon-btn"
        style={{ width: '22px', height: '22px' }}
        title="Nakaraang talata"
        disabled={activeVerseIndex <= 0}
      >
        <SkipBack size={12} />
      </button>

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="action-icon-btn"
        style={{
          background: isPlaying ? 'var(--accent-gold)' : 'var(--bg-input)',
          color: isPlaying ? '#000' : 'var(--text-gold)',
          width: '26px',
          height: '26px'
        }}
        title={isPlaying ? t.pauseAudio : t.playChapter}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '1px' }} />}
      </button>

      {/* Verse navigation: Next */}
      <button
        type="button"
        onClick={handleNextVerse}
        className="action-icon-btn"
        style={{ width: '22px', height: '22px' }}
        title="Susunod na talata"
        disabled={activeVerseIndex >= verses.length - 1}
      >
        <SkipForward size={12} />
      </button>

      {isPlaying && (
        <button
          type="button"
          onClick={stop}
          className="action-icon-btn"
          style={{ width: '22px', height: '22px' }}
          title={t.stopAudio}
        >
          <Square size={11} />
        </button>
      )}

      {/* Speed Rate Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {[0.8, 1.0, 1.25].map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            style={{
              padding: '1px 4px',
              fontSize: '0.64rem',
              borderRadius: '3px',
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
