import React, { useState, useEffect, useRef } from 'react';
import { Verse, BookMetadata } from '../types/bible';
import { 
  Volume2, 
  Play, 
  Pause, 
  Square, 
  ChevronDown, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Loader2,
  ExternalLink,
  Check
} from 'lucide-react';
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

interface AudioLanguageSource {
  id: string;
  name: string;
  subtitle: string;
  flag: string;
  code: number;
  hebrewCode?: number;
}

const AUDIO_SOURCES: AudioLanguageSource[] = [
  { 
    id: 'fil', 
    name: 'Filipino / Tagalog', 
    subtitle: 'Ang Dating Biblia (ADB) 1905', 
    flag: '🇵🇭', 
    code: 46 
  },
  { 
    id: 'en', 
    name: 'English', 
    subtitle: 'King James Version (KJV)', 
    flag: '🇺🇸', 
    code: 1 
  },
  { 
    id: 'orig', 
    name: 'Orihinal na Wika', 
    subtitle: 'Hebreo (Lumang Tipan) / Griyego (Bagong Tipan)', 
    flag: '📜', 
    code: 58, 
    hebrewCode: 44 
  },
  { 
    id: 'es', 
    name: 'Español', 
    subtitle: 'Reina Valera Spanish Audio', 
    flag: '🇪🇸', 
    code: 6 
  },
  { 
    id: 'zh', 
    name: '中文 (Mandarin)', 
    subtitle: 'Chinese Audio Bible', 
    flag: '🇨🇳', 
    code: 4 
  },
  { 
    id: 'ar', 
    name: 'العربية (Arabic)', 
    subtitle: 'Arabic Audio Bible', 
    flag: '🇸🇦', 
    code: 16 
  }
];

export function getChapterAudioUrl(sourceId: string, bookId: number, chapter: number): string {
  let code = 46; // default Filipino ADB
  if (sourceId === 'en') code = 1;
  else if (sourceId === 'zh') code = 4;
  else if (sourceId === 'ar') code = 16;
  else if (sourceId === 'es') code = 6;
  else if (sourceId === 'orig') {
    // OT is Hebrew (44), NT is Greek (58)
    code = bookId <= 39 ? 44 : 58;
  }
  return `https://www.wordproaudio.net/bibles/app/audio/${code}/${bookId}/${chapter}.mp3`;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [hasError, setHasError] = useState(false);

  // Audio language selection
  const defaultSelectedLang = currentTranslation === 'kjv' ? 'en' : (currentTranslation === 'orig' ? 'orig' : 'fil');
  const [selectedSourceId, setSelectedSourceId] = useState<string>(defaultSelectedLang);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const t = translations[lang] || translations.tl;
  const currentAudioUrl = getChapterAudioUrl(selectedSourceId, book.id, chapter);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showDropdown]);

  // Handle chapter or book change: load new track
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.pause();
      audioRef.current.src = currentAudioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setDuration(0);
      setHasError(false);

      if (wasPlaying) {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(false);
      }
    }
  }, [book.id, chapter, selectedSourceId]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoadingAudio(true);
      setHasError(false);
      if (!audioRef.current.src || audioRef.current.src === '') {
        audioRef.current.src = currentAudioUrl;
      }
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        })
        .catch(err => {
          console.warn('Audio play failed:', err);
          setIsPlaying(false);
          setIsLoadingAudio(false);
          setHasError(true);
        });
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    setIsPlaying(false);
  };

  const seekForward = (seconds = 10) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + seconds, duration || 9999);
    }
  };

  const seekBackward = (seconds = 10) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - seconds, 0);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const activeSource = AUDIO_SOURCES.find(s => s.id === selectedSourceId) || AUDIO_SOURCES[0];
  const downloadFileName = `${book.tagalog.replace(/\s+/g, '_')}_Kap_${chapter}_${activeSource.name.split('/')[0].trim()}.mp3`;

  return (
    <div 
      className="suribibliya-audio-player"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--bg-card)',
        padding: '3px 8px',
        borderRadius: 'var(--radius-full)',
        border: isPlaying ? '1px solid #10b981' : '1px solid var(--border-subtle)',
        fontSize: '0.78rem',
        position: 'relative',
        boxShadow: isPlaying ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
        transition: 'border 0.2s, box-shadow 0.2s'
      }}
    >
      {/* Hidden standard HTML5 audio element */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        preload="metadata"
        onLoadStart={() => setIsLoadingAudio(true)}
        onCanPlay={() => setIsLoadingAudio(false)}
        onWaiting={() => setIsLoadingAudio(true)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
          setHasError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
            setIsLoadingAudio(false);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsLoadingAudio(false);
          setIsPlaying(false);
          setHasError(true);
        }}
      />

      {/* Speaker Icon & Status */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          color: isPlaying ? '#10b981' : 'var(--text-gold)', 
          fontWeight: 600,
          cursor: 'pointer'
        }}
        onClick={togglePlay}
        title={isPlaying ? 'I-pause ang Audio' : 'Pakinggan ang Kabanata'}
      >
        {isLoadingAudio ? (
          <Loader2 size={15} className="search-spinner" />
        ) : (
          <Volume2 
            size={15} 
            style={{ 
              animation: isPlaying ? 'pulse 1.5s infinite' : 'none',
              filter: isPlaying ? 'drop-shadow(0 0 4px #10b981)' : 'none'
            }} 
          />
        )}
      </div>

      {/* Language / Source Dropdown Trigger */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            color: isPlaying ? '#10b981' : 'var(--text-primary)',
            fontSize: '0.72rem',
            padding: '2px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            maxWidth: '125px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600
          }}
          title={`Wika: ${activeSource.name}`}
        >
          <span>{activeSource.flag} {activeSource.name.split('/')[0].trim()}</span>
          <ChevronDown size={11} />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="audio-dropdown-panel"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
              padding: '8px',
              zIndex: 3000,
              minWidth: '270px',
              maxHeight: '380px',
              overflowY: 'auto'
            }}
          >
            <div style={{ fontSize: '0.68rem', color: 'var(--text-gold)', padding: '2px 6px 6px 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pumili ng Boses / Audio Bible:
            </div>

            {/* Language Options */}
            {AUDIO_SOURCES.map(source => {
              const isSelected = selectedSourceId === source.id;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => {
                    setSelectedSourceId(source.id);
                    setShowDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 8px',
                    background: isSelected ? 'var(--accent-gold-glow)' : 'transparent',
                    color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '3px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{source.flag}</span>
                      <span>{source.name}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {source.subtitle}
                    </div>
                  </div>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent-gold)' }} />}
                </button>
              );
            })}

            {/* Download MP3 Option in Dropdown */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '6px' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', padding: '2px 6px 4px 6px' }}>
                Offline Listening:
              </div>
              <a
                href={currentAudioUrl}
                download={downloadFileName}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '7px 8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-gold)',
                  textDecoration: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
                onClick={() => setShowDropdown(false)}
                title="I-download ang MP3 audio file para pakinggan kahit walang internet"
              >
                <Download size={13} />
                <span>I-download ang MP3 ({book.tagalog} {chapter})</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Skip backward 10s */}
      <button
        type="button"
        onClick={() => seekBackward(10)}
        className="action-icon-btn"
        style={{ width: '20px', height: '20px' }}
        title="I-atras ng 10 segundo (-10s)"
      >
        <RotateCcw size={11} />
      </button>

      {/* Main Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="action-icon-btn"
        style={{
          background: isPlaying ? '#10b981' : 'var(--accent-gold)',
          color: isPlaying ? '#ffffff' : '#000000',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          boxShadow: isPlaying ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
        }}
        title={isPlaying ? 'I-pause ang Audio' : 'Pakinggan ang Kabanata'}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '1px' }} />}
      </button>

      {/* Skip forward 10s */}
      <button
        type="button"
        onClick={() => seekForward(10)}
        className="action-icon-btn"
        style={{ width: '20px', height: '20px' }}
        title="I-abante ng 10 segundo (+10s)"
      >
        <RotateCw size={11} />
      </button>

      {/* Stop Button (visible while playing or paused past 0) */}
      {(isPlaying || currentTime > 0) && (
        <button
          type="button"
          onClick={stopAudio}
          className="action-icon-btn"
          style={{ width: '20px', height: '20px' }}
          title="Itigil ang audio"
        >
          <Square size={10} />
        </button>
      )}

      {/* Scrubbing Bar & Time Display */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px' 
        }}
      >
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeekChange}
          style={{
            width: '60px',
            height: '4px',
            accentColor: isPlaying ? '#10b981' : 'var(--accent-gold)',
            cursor: 'pointer'
          }}
          title={`Oras: ${formatTime(currentTime)} / ${formatTime(duration)}`}
        />
        <span 
          style={{ 
            fontSize: '0.67rem', 
            color: isPlaying ? '#10b981' : 'var(--text-muted)', 
            fontVariantNumeric: 'tabular-nums',
            minWidth: '56px' 
          }}
        >
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>
      </div>

      {/* Speed Rate Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {[0.8, 1.0, 1.25].map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            style={{
              padding: '1px 3px',
              fontSize: '0.62rem',
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

      {/* Direct Download Icon Button */}
      <a
        href={currentAudioUrl}
        download={downloadFileName}
        target="_blank"
        rel="noopener noreferrer"
        className="action-icon-btn"
        style={{ 
          width: '22px', 
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          color: 'var(--text-gold)'
        }}
        title={`I-download ang MP3 ng ${book.tagalog} ${chapter} para sa offline`}
      >
        <Download size={12} />
      </a>

      {/* Offline/Error notice */}
      {hasError && (
        <span 
          style={{ 
            color: '#ef4444', 
            fontSize: '0.65rem', 
            marginLeft: '4px' 
          }}
          title="Kailangan ng koneksyon sa internet o i-download ang MP3 audio"
        >
          Offline (I-download ang MP3)
        </span>
      )}
    </div>
  );
};
