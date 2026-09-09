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

// Keep a persistent global reference to the SpeechSynthesisUtterance to prevent
// Android Chromium WebView garbage collector from abruptly stopping playback midway.
declare global {
  interface Window {
    __sbActiveUtterance?: SpeechSynthesisUtterance | null;
  }
}

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
  
  // Default to English if looking at KJV, otherwise Filipino ADB
  const defaultVoice = currentTranslation === 'kjv' ? 'english-natural' : 'filipino-natural';
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(defaultVoice);
  const [showVoiceMenu, setShowVoiceMenu] = useState<boolean>(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceMenuRef = useRef<HTMLDivElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const activeChunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const currentVerseIdxRef = useRef<number>(activeVerseIndex);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setTimeout(updateVoices, 800);
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

    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current.removeAttribute('src');
        currentAudioRef.current.load();
      } catch {
        // ignore
      }
      currentAudioRef.current = null;
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

    activeChunksRef.current = [];
    chunkIndexRef.current = 0;
  };

  // Helper to split text into digestible chunks for TTS streaming (max ~130 chars)
  const splitTextIntoChunks = (text: string, maxLen = 130): string[] => {
    const clean = text.replace(/<S>\d+<\/S>/g, '').trim();
    if (clean.length <= maxLen) return [clean];

    const parts = clean.split(/([,;:.!?]+)/);
    const chunks: string[] = [];
    let current = '';

    for (let i = 0; i < parts.length; i += 2) {
      const sentence = (parts[i] || '') + (parts[i + 1] || '');
      if ((current + sentence).length <= maxLen) {
        current += sentence;
      } else {
        if (current.trim()) chunks.push(current.trim());
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

  // Get text to speak for verse based on chosen language/voice
  const getVerseTextToSpeak = (verseObj: Verse, isEnglish: boolean): string => {
    if (isEnglish) {
      const cleanKjv = verseObj.kjv.replace(/<S>\d+<\/S>/g, '').trim();
      return `Verse ${verseObj.v}. ${cleanKjv}`;
    }
    return `Talata ${verseObj.v}. ${verseObj.adb}`;
  };

  /**
   * Primary Engine: High-quality natural audio streaming via direct Google TTS.
   * Works on any Android phone (even during calls, low memory, or when offline TTS is missing).
   */
  const playCloudTTSChunk = (verseIdx: number, langCode: 'tl' | 'en') => {
    if (!isPlayingRef.current) return;

    if (chunkIndexRef.current >= activeChunksRef.current.length) {
      // Verse finished, move to next verse in the chapter
      if (verseIdx + 1 < verses.length) {
        const nextIdx = verseIdx + 1;
        onVerseChange(nextIdx);
        playVerse(nextIdx);
      } else {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
      return;
    }

    const chunk = activeChunksRef.current[chunkIndexRef.current];
    const encoded = encodeURIComponent(chunk);
    // Direct Google Cloud TTS stream endpoint (returns audio/mpeg)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${langCode}&client=tw-ob`;

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
      } catch {
        // ignore
      }
    }

    setIsLoadingAudio(true);
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = url;
    audio.playbackRate = rate;
    currentAudioRef.current = audio;

    audio.oncanplay = () => {
      setIsLoadingAudio(false);
    };

    audio.onended = () => {
      if (!isPlayingRef.current) return;
      chunkIndexRef.current += 1;
      playCloudTTSChunk(verseIdx, langCode);
    };

    audio.onerror = () => {
      setIsLoadingAudio(false);
      if (!isPlayingRef.current) return;
      // Network failed or blocked: seamlessly fallback to local SpeechSynthesis
      playViaSpeechSynth(verseIdx);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsLoadingAudio(false);
        })
        .catch(() => {
          setIsLoadingAudio(false);
          if (!isPlayingRef.current) return;
          // Fallback to local SpeechSynthesis
          playViaSpeechSynth(verseIdx);
        });
    }
  };

  /**
   * Secondary Fallback Engine: Device SpeechSynthesis.
   * Completely hardened for Android Chrome / WebView bugs.
   */
  const playViaSpeechSynth = (index: number) => {
    if (!isPlayingRef.current || !synthRef.current || index >= verses.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoadingAudio(false);
      return;
    }

    setIsLoadingAudio(false);

    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    try {
      synthRef.current.cancel();
    } catch {
      // ignore
    }

    const isEnglish = selectedVoiceURI === 'english-natural' || selectedVoiceURI.toLowerCase().includes('english') || selectedVoiceURI.toLowerCase().includes('en-');
    const verseObj = verses[index];
    const textToSpeak = getVerseTextToSpeak(verseObj, isEnglish);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = rate;

    // Save global reference to prevent GC on Android
    if (typeof window !== 'undefined') {
      window.__sbActiveUtterance = utterance;
    }

    // Voice selection
    const matched = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    if (matched) {
      utterance.voice = matched;
      utterance.lang = matched.lang;
    } else if (isEnglish) {
      const enVoice = availableVoices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = 'en-US';
    } else {
      // Filipino voice search
      const filVoice = availableVoices.find(v =>
        v.lang.startsWith('fil') || v.lang.startsWith('tl') || v.name.toLowerCase().includes('filipino') || v.name.toLowerCase().includes('tagalog')
      );
      if (filVoice) {
        utterance.voice = filVoice;
        utterance.lang = filVoice.lang;
      } else {
        // Many Android devices don't have Filipino TTS installed.
        // Fall back to default voice rather than throwing an error!
        utterance.lang = 'en-US';
      }
    }

    utterance.onstart = () => {
      // Android WebView keep-alive
      if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = setInterval(() => {
        if (synthRef.current && synthRef.current.paused && isPlayingRef.current) {
          synthRef.current.resume();
        }
      }, 10000);
    };

    utterance.onend = () => {
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
      }
      if (!isPlayingRef.current) return;
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
      if (!isPlayingRef.current || e.error === 'canceled' || e.error === 'interrupted') {
        return;
      }

      // If language was unavailable on device, try one more time with default voice
      if (e.error === 'language-unavailable') {
        try {
          const retryUtterance = new SpeechSynthesisUtterance(textToSpeak);
          retryUtterance.rate = rate;
          if (typeof window !== 'undefined') window.__sbActiveUtterance = retryUtterance;
          retryUtterance.onend = utterance.onend;
          synthRef.current?.speak(retryUtterance);
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
    } catch {
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  };

  const playVerse = (index: number) => {
    if (index < 0 || index >= verses.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    // Reset previous audio
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current = null;
      } catch {
        // ignore
      }
    }
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch {
        // ignore
      }
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const verseObj = verses[index];

    if (selectedVoiceURI === 'filipino-natural') {
      const fullText = getVerseTextToSpeak(verseObj, false);
      activeChunksRef.current = splitTextIntoChunks(fullText, 130);
      chunkIndexRef.current = 0;
      playCloudTTSChunk(index, 'tl');
    } else if (selectedVoiceURI === 'english-natural') {
      const fullText = getVerseTextToSpeak(verseObj, true);
      activeChunksRef.current = splitTextIntoChunks(fullText, 130);
      chunkIndexRef.current = 0;
      playCloudTTSChunk(index, 'en');
    } else {
      // User chose a specific device voice
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

  // Label for active voice display
  const getSelectedVoiceName = () => {
    if (selectedVoiceURI === 'filipino-natural') {
      return '🇵🇭 Filipino (ADB)';
    }
    if (selectedVoiceURI === 'english-natural') {
      return '🇺🇸 English (KJV)';
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

      {/* Voice Selection Dropdown Trigger */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowVoiceMenu(!showVoiceMenu)}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            color: selectedVoiceURI === 'filipino-natural' ? '#10b981' : selectedVoiceURI === 'english-natural' ? '#38bdf8' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            maxWidth: '135px',
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
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-gold)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'Select Audio Language:' : 'Pumili ng Boses / Wika:'}
            </div>

            {/* 1. Featured Filipino Natural Voice */}
            <button
              type="button"
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
                marginBottom: '4px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>🇵🇭 Filipino (Tagalog ADB)</div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                  {lang === 'en' ? 'Natural native Tagalog audio (ADB)' : 'Likas na boses Tagalog (Ang Dating Biblia)'}
                </div>
              </div>
              {selectedVoiceURI === 'filipino-natural' && <span style={{ color: 'var(--accent-gold)' }}>✓</span>}
            </button>

            {/* 2. Featured English Natural Voice */}
            <button
              type="button"
              onClick={() => {
                const wasPlaying = isPlaying;
                stopAllAudio();
                setSelectedVoiceURI('english-natural');
                setShowVoiceMenu(false);
                if (wasPlaying) {
                  playVerse(activeVerseIndex >= 0 ? activeVerseIndex : 0);
                }
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                background: selectedVoiceURI === 'english-natural' ? 'var(--accent-gold-glow)' : 'transparent',
                color: selectedVoiceURI === 'english-natural' ? 'var(--accent-gold)' : '#38bdf8',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>🇺🇸 English (KJV Bible)</div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                  {lang === 'en' ? 'Clear King James Version audio' : 'Malinaw na English audio ng KJV'}
                </div>
              </div>
              {selectedVoiceURI === 'english-natural' && <span style={{ color: 'var(--accent-gold)' }}>✓</span>}
            </button>

            {/* 3. Device System Voices if any */}
            {availableVoices.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0', paddingTop: '4px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '2px 8px' }}>
                  {lang === 'en' ? 'Device Offline Voices:' : 'Mga Boses sa Device:'}
                </div>
                {availableVoices.slice(0, 8).map(v => {
                  const isSelected = v.voiceURI === selectedVoiceURI;
                  return (
                    <button
                      key={v.voiceURI}
                      type="button"
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
            onClick={() => {
              setRate(r);
              if (currentAudioRef.current) {
                currentAudioRef.current.playbackRate = r;
              }
            }}
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
