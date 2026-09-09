import React, { useState, useEffect } from 'react';
import { UserSettings } from '../services/notesService';
import { 
  Settings, 
  X, 
  Key, 
  Palette, 
  Type, 
  ShieldCheck, 
  Globe, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  Volume2, 
  Brain, 
  MoreVertical, 
  Search, 
  Bookmark, 
  Layers,
  Smartphone,
  Download,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { AppTheme } from '../types/bible';
import { translations, AppLanguage } from '../services/i18n';

// Authentic GitHub Octocat Icon
const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface SettingsModalProps {
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settings: Partial<UserSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'guide'>('general');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [theme, setTheme] = useState<AppTheme>(settings.theme);
  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily);
  const [searchLang, setSearchLang] = useState<'tgl' | 'en' | 'all'>(settings.searchLanguage || 'tgl');
  const [appLang, setAppLang] = useState<AppLanguage>(settings.appLanguage || 'tl');
  const [savedApiKeySuccess, setSavedApiKeySuccess] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        appLang === 'en'
          ? 'To install SuriBibliya on Android:\n1. Open this website in Google Chrome or Edge on your phone.\n2. Tap the 3 dots menu (⋮) at top right.\n3. Tap "Install App" or "Add to Home screen".'
          : 'Upang i-install ang SuriBibliya sa iyong Android Phone:\n1. Buksan ang website na ito sa Google Chrome o Edge sa iyong cellphone.\n2. Pindutin ang 3 tuldok (⋮) sa kanang itaas.\n3. Piliin ang "Idagdag sa Home screen" o "I-install ang App".'
      );
    }
  };

  useEffect(() => {
    setTheme(settings.theme);
    setFontSize(settings.fontSize);
    setFontFamily(settings.fontFamily);
    setSearchLang(settings.searchLanguage || 'tgl');
    setAppLang(settings.appLanguage || 'tl');
    setApiKey(settings.geminiApiKey || '');
  }, [settings]);

  if (!isOpen) return null;

  const t = translations[appLang] || translations.tl;

  // Immediate Theme Switch
  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    onSaveSettings({ theme: newTheme });
  };

  // Immediate App Language Switch
  const handleSelectAppLang = (newLang: AppLanguage) => {
    setAppLang(newLang);
    onSaveSettings({ appLanguage: newLang });
  };

  // Immediate Font Family Switch
  const handleSelectFontFamily = (newFont: 'serif' | 'sans') => {
    setFontFamily(newFont);
    onSaveSettings({ fontFamily: newFont });
  };

  // Immediate Font Size Switch
  const handleSelectFontSize = (newSize: 'small' | 'medium' | 'large' | 'xlarge') => {
    setFontSize(newSize);
    onSaveSettings({ fontSize: newSize });
  };

  // Immediate Search Language Switch
  const handleSelectSearchLang = (newLang: 'tgl' | 'en' | 'all') => {
    setSearchLang(newLang);
    onSaveSettings({ searchLanguage: newLang });
  };

  const handleSaveApiKey = () => {
    onSaveSettings({ geminiApiKey: apiKey.trim() });
    setSavedApiKeySuccess(true);
    setTimeout(() => setSavedApiKeySuccess(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: activeTab === 'guide' ? '680px' : '540px', transition: 'max-width 0.25s ease' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <button 
            type="button"
            className="modal-back-btn" 
            onClick={onClose} 
            title={appLang === 'en' ? 'Back to Bible reading' : 'Bumalik sa Pagbasa ng Bibliya'}
          >
            <ChevronLeft size={20} />
            <span>{appLang === 'en' ? 'Back' : 'Bumalik'}</span>
          </button>

          <div className="modal-title">
            <Settings size={20} className="text-gold" />
            <span>{t.settingsTitle}</span>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose} title={t.close}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs Header */}
        <div className="settings-tabs">
          <button
            className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings size={15} />
            <span>{t.tabSettingsGeneral}</span>
          </button>

          <button
            className={`settings-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            <HelpCircle size={15} />
            <span>{t.tabSettingsGuide}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {activeTab === 'general' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* App Interface Language */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Globe size={16} />
                    <span>{t.appLangLabel}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{t.themeAppliedLive}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectAppLang('tl')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: appLang === 'tl' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: appLang === 'tl' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: appLang === 'tl' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: appLang === 'tl' ? 700 : 500
                    }}
                  >
                    🇵🇭 Tagalog (Filipino) {appLang === 'tl' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAppLang('en')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: appLang === 'en' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: appLang === 'en' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: appLang === 'en' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: appLang === 'en' ? 700 : 500
                    }}
                  >
                    🇺🇸 English (US/International) {appLang === 'en' ? '✓' : ''}
                  </button>
                </div>
              </div>

              {/* Theme Selector (Instant Live Apply) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Palette size={16} />
                    <span>{t.themeLabel}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{t.themeAppliedLive}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('obsidian')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: '#0a0c10',
                      color: '#e6c687',
                      border: theme === 'obsidian' ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      boxShadow: theme === 'obsidian' ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none'
                    }}
                  >
                    {t.themeObsidian} {theme === 'obsidian' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme('parchment')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: '#f4eee1',
                      color: '#291d12',
                      border: theme === 'parchment' ? '2px solid #8b5e14' : '1px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      boxShadow: theme === 'parchment' ? '0 0 10px rgba(139, 94, 20, 0.3)' : 'none'
                    }}
                  >
                    {t.themeParchment} {theme === 'parchment' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme('sapphire')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: '#050a14',
                      color: '#7dd3fc',
                      border: theme === 'sapphire' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      boxShadow: theme === 'sapphire' ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none'
                    }}
                  >
                    {t.themeSapphire} {theme === 'sapphire' ? '✓' : ''}
                  </button>
                </div>
              </div>

              {/* Search Language Default Setting */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Search size={16} />
                    <span>{t.searchLangLabel}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{t.themeAppliedLive}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectSearchLang('tgl')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: searchLang === 'tgl' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: searchLang === 'tgl' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: searchLang === 'tgl' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: searchLang === 'tgl' ? 700 : 500
                    }}
                  >
                    {t.tagalogAdb} {searchLang === 'tgl' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSearchLang('en')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: searchLang === 'en' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: searchLang === 'en' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: searchLang === 'en' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: searchLang === 'en' ? 700 : 500
                    }}
                  >
                    {t.englishKjv} {searchLang === 'en' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSearchLang('all')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: searchLang === 'all' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: searchLang === 'all' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: searchLang === 'all' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: searchLang === 'all' ? 700 : 500
                    }}
                  >
                    {t.bothLanguages} {searchLang === 'all' ? '✓' : ''}
                  </button>
                </div>
              </div>

              {/* Typography Controls */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Type size={16} />
                  <span>{t.typographyLabel}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectFontFamily('serif')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: fontFamily === 'serif' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: fontFamily === 'serif' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: fontFamily === 'serif' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-serif-reading)',
                      fontSize: '0.95rem'
                    }}
                  >
                    {t.fontSerif} {fontFamily === 'serif' ? '✓' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectFontFamily('sans')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: fontFamily === 'sans' ? 'var(--accent-gold-glow)' : 'var(--bg-card)',
                      color: fontFamily === 'sans' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: fontFamily === 'sans' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.9rem'
                    }}
                  >
                    {t.fontSans} {fontFamily === 'sans' ? '✓' : ''}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['small', 'medium', 'large', 'xlarge'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSelectFontSize(size)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        background: fontSize === size ? 'var(--accent-gold)' : 'var(--bg-card)',
                        color: fontSize === size ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {size === 'small' ? t.fontSmall : size === 'medium' ? t.fontMedium : size === 'large' ? t.fontLarge : t.fontXLarge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gemini API Key */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                  <Key size={16} />
                  <span>{t.apiKeyLabel}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5 }}>
                  {t.apiKeyDesc}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    placeholder={appLang === 'en' ? 'Enter your Google Gemini API key...' : 'Ilagay ang iyong Gemini API key dito...'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    onClick={handleSaveApiKey}
                    style={{
                      background: 'var(--accent-gold)',
                      color: '#080a0e',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0 14px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {savedApiKeySuccess ? t.apiKeySaved : t.apiKeySaveBtn}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={14} color="#10b981" />
                  <span>{appLang === 'en' ? 'Stored only locally in your browser.' : 'Lokal na nakaimbak lamang sa browser.'}</span>
                </div>
              </div>

              {/* Android App & PWA Download */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Smartphone size={16} />
                    <span>{appLang === 'en' ? 'SuriBibliya for Android' : 'SuriBibliya para sa Android'}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                    Android PWA / App
                  </span>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {appLang === 'en'
                    ? 'Install SuriBibliya directly onto your Android device! It runs fullscreen without browser bars, provides offline Bible reading, and places bottom navigation at your thumbs.'
                    : 'I-install ang SuriBibliya nang direkta sa iyong Android phone! Gumagana ito nang fullscreen na walang browser address bar, may offline reading ng Bibliya, at may bottom navigation bar para sa madaling pag-access gamit ang daliri.'}
                </p>

                <button
                  type="button"
                  onClick={handleInstallPWA}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-gold)',
                    color: '#080a0e',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <Download size={15} />
                  <span>{appLang === 'en' ? 'Install App on Android' : 'I-download / I-install sa Android'}</span>
                </button>

                <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  💡 {appLang === 'en' 
                    ? 'Tip: In Chrome or Edge on Android, tap the 3 dots menu (⋮) at top right -> "Install App" or "Add to Home screen".' 
                    : 'Paalala: Sa Chrome o Edge sa iyong Android phone, pindutin ang 3 tuldok (⋮) sa kanang itaas -> "Idagdag sa Home screen" o "I-install ang App".'}
                </div>
              </div>

              {/* Creator & Developer Profile (Created by: Antero Salamanca) */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--accent-gold)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-gold), #996515)',
                    color: '#080a0e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.05rem',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 14px var(--accent-gold-glow)',
                    flexShrink: 0
                  }}>
                    AS
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                      {appLang === 'en' ? 'Created by' : 'Nilikha ni'}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-gold)', letterSpacing: '0.02em' }}>
                      Antero Salamanca
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      SuriBibliya Studio Creator & Developer
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <a
                    href="https://github.com/Antaresu/SuriBibliya"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <GithubIcon size={15} />
                    <span>github.com/Antaresu/SuriBibliya</span>
                    <ExternalLink size={12} style={{ opacity: 0.7 }} />
                  </a>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    SuriBibliya v1.0.0 (Web & Android)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* User Guide Tab */
            <div className="guide-section">
              {/* Feature 1: Multilingual Scripture Reading */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <BookOpen size={18} color="var(--accent-gold)" />
                  <span>{appLang === 'en' ? '1. Multilingual Scripture Reading' : '1. Pagbasa ng Kasulatan (Multilingual)'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Read Scripture across three powerful view modes using the top toolbar:
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Single:</strong> Focus on one translation (Tagalog ADB, English KJV, or Original Greek/Hebrew).
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Parallel (3):</strong> Side-by-side comparison across Tagalog (ADB 1905), English (KJV with Strong's), and Original Hebrew (WLC) or Greek (Textus Receptus).
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Interlinear:</strong> Word-for-word layered stack with full Strong's annotations.
                    </>
                  ) : (
                    <>
                      Magbasa ng Banal na Kasulatan gamit ang 3 mode sa itaas na toolbar:
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Isahan (Single):</strong> Pagtutuon sa isang salin (Tagalog ADB, English KJV, o Orihinal).
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Magkatabi (Parallel 3):</strong> Sabay-sabay na paghahambing ng Tagalog (ADB 1905), Ingles (KJV with Strong's), at Orihinal na Hebreo (WLC) o Griyego (Textus Receptus).
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Interlinear:</strong> Patong-patong na paghimay ng bawat talata kasama ang buong Strong's tags.
                    </>
                  )}
                </p>
              </div>

              {/* Feature 2: Strong's Concordance */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <Layers size={18} color="#38bdf8" />
                  <span>{appLang === 'en' ? '2. Strong\'s Concordance & Original Lexicon' : '2. Strong\'s Concordance & Orihinal na Wika'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Every Greek and Hebrew word in KJV and Original text features golden Strong's numbers (e.g., <span className="guide-badge">3056</span> for <em>Logos</em>, <span className="guide-badge">1254</span> for <em>Bara</em>).
                      <br />Click any Strong's tag to view its root lemma, transliteration, phonetic pronunciation, derivation, and complete King James Lexicon definition.
                    </>
                  ) : (
                    <>
                      Ang bawat salitang Griyego at Hebreo sa KJV at Orihinal ay may gintong Strong's tag (tulad ng <span className="guide-badge">3056</span> para sa <em>Logos</em> o <span className="guide-badge">1254</span> para sa <em>Bara</em>).
                      <br />I-click ang alinmang numero upang makita ang root lemma, pagbigkas, etymology, at buong kahulugan sa Lexicon.
                    </>
                  )}
                </p>
              </div>

              {/* Feature 3: Logic & Syllogism Engine */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <Brain size={18} color="#f59e0b" />
                  <span>{appLang === 'en' ? '3. Syllogistic Logic & Exegesis Engine' : '3. Lohikal na Himay (Syllogism) at Exegesis'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Click the brain icon (🧠) in the top navigation or on any verse to open the Exegesis Inspector:
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Major Premise:</strong> The universal divine truth established by theology.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Minor Premise:</strong> The concrete assertion or situation in the verse.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Logical Deduction:</strong> The necessary theological conclusion.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Discourse Connectives:</strong> Detection of causal (<em>for/sapagkat</em>), inferential (<em>therefore/samakatuwid</em>), and contrastive (<em>but/datapwa't</em>) conjunctions governing the argument.
                    </>
                  ) : (
                    <>
                      I-click ang brain icon (🧠) sa itaas o sa alinmang talata upang buksan ang Pagsusuring Lohikal:
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Major Premise:</strong> Pangkalahatang banal na katotohanan.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Minor Premise:</strong> Tiyak na pahayag o sitwasyon sa talata.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Lohikal na Konklusyon:</strong> Ang hindi matututulang resulta ng argumentasyon.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Discourse Connectives:</strong> Awtomatikong pagsusuri sa mga pang-ugnay tulad ng <em>sapagkat</em> (sanhi), <em>samakatuwid</em> (hinuha), at <em>datapwa't</em> (pagtutol).
                    </>
                  )}
                </p>
              </div>

              {/* Feature 4: Three-Dots Menu */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <MoreVertical size={18} color="#10b981" />
                  <span>{appLang === 'en' ? '4. Verse Actions Menu (Three Dots ⋮)' : '4. Aksyon sa Talata (Tatlong Tuldok ⋮)'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Click the discreet three dots (<strong style={{ color: 'var(--text-gold)' }}>⋮</strong>) button on the top right of any verse to access actions without cluttering the text:
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Highlight:</strong> Choose from 5 elegant colors (Amber, Emerald, Cyan, Purple, Rose).
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Study Note:</strong> Record observations and thoughts with tags and export as Markdown.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Cross-References:</strong> Explore 340,000+ Treasury of Scripture Knowledge (TSK) linked verses.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Bookmark & Copy:</strong> Save to bookmarks or copy text with citations.
                    </>
                  ) : (
                    <>
                      Pindutin ang tatlong tuldok (<strong style={{ color: 'var(--text-gold)' }}>⋮</strong>) sa kanang bahagi ng alinmang talata para sa malinis na menu:
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Highlight:</strong> Pumili mula sa 5 kulay (Amber, Emerald, Cyan, Purple, Rose).
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Study Note:</strong> Magtala ng obserbasyon, lagyan ng tags, at i-export sa Markdown.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Cross-References:</strong> Silipin ang 340,000+ kaugnay na talata mula sa Treasury of Scripture Knowledge.
                      <br />• <strong style={{ color: 'var(--text-primary)' }}>Bookmark at Kopya:</strong> I-save sa talaan o kopyahin nang kumpleto ang talata.
                    </>
                  )}
                </p>
              </div>

              {/* Feature 5: Audio Reader */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <Volume2 size={18} color="#ec4899" />
                  <span>{appLang === 'en' ? '5. Audio Chapter Reader' : '5. Audio Reader ng Kabanata'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Listen to any chapter with high clarity text-to-speech:
                      <br />• Toggle between Tagalog (ADB) and English (KJV) audio.
                      <br />• Select installed voices on your operating system (supports natural Tagalog and English voices).
                      <br />• Adjust speed rate: 0.8x, 1.0x, or 1.25x.
                    </>
                  ) : (
                    <>
                      Pakinggan ang buong kabanata gamit ang text-to-speech:
                      <br />• Lumipat sa pagitan ng Tagalog (ADB) at Ingles (KJV).
                      <br />• Pumili mula sa mga naka-install na boses sa iyong computer (sumusuporta sa natural na Tagalog at Ingles).
                      <br />• Baguhin ang bilis ng pagbasa: 0.8x, 1.0x, o 1.25x.
                    </>
                  )}
                </p>
              </div>

              {/* Feature 6: Universal Search & Shortcuts */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <Search size={18} color="#a855f7" />
                  <span>{appLang === 'en' ? '6. Universal Search & Shortcuts' : '6. Mabilisang Paghahanap at Shortcuts'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Press <span className="guide-badge">Ctrl + K</span> anytime to search 31,296 verses instantly.
                      <br />Search by book and reference (e.g. <em>John 3:16</em> or <em>Roma 8:28</em>) or keywords in English and Tagalog (e.g. <em>righteousness</em>, <em>pag-ibig</em>).
                    </>
                  ) : (
                    <>
                      Pindutin ang <span className="guide-badge">Ctrl + K</span> kahit kailan upang maghanap sa 31,296 talata.
                      <br />Mag-type ng reference (tulad ng <em>Juan 3:16</em> o <em>Genesis 1:1</em>) o salita (tulad ng <em>biyaya</em>, <em>pananampalataya</em>).
                    </>
                  )}
                </p>
              </div>

              {/* Feature 7: Gemini AI Integration */}
              <div className="guide-card">
                <div className="guide-card-title">
                  <Sparkles size={18} color="var(--accent-gold)" />
                  <span>{appLang === 'en' ? '7. Optional Gemini AI Assistant' : '7. Katulong na AI (Google Gemini - Opsyonal)'}</span>
                </div>
                <p className="guide-card-text">
                  {appLang === 'en' ? (
                    <>
                      Configure your free Google Gemini API key in the General Settings tab to unlock deep interactive exegesis, Greek/Hebrew verbal parsing, comparative translation analysis, and sermon outlines.
                    </>
                  ) : (
                    <>
                      Ilagay ang libreng Google Gemini API key sa General Settings tab upang magamit ang malalimang pagsusuri, apologetics, pagsusuri sa orihinal na wika, at pagbuo ng outline para sa pagtuturo o sermon.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Prominent Dismiss Button for mobile and desktop */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              className="save-note-btn"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer'
              }}
            >
              <BookOpen size={18} />
              <span>{appLang === 'en' ? 'Close & Return to Bible Reading' : 'Isara at Bumalik sa Pagbasa ng Bibliya'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
