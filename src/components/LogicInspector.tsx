import React, { useState, useEffect } from 'react';
import { BookMetadata, Verse, ExegesisAnalysis } from '../types/bible';
import { logicAnalyzerService } from '../services/logicAnalyzer';
import { Brain, Sparkles, HelpCircle, Layers, BookOpen, Send, AlertCircle } from 'lucide-react';

import { translations, AppLanguage } from '../services/i18n';

interface LogicInspectorProps {
  book: BookMetadata;
  chapter: number;
  verse: Verse | null;
  geminiApiKey: string;
  lang?: AppLanguage;
  onOpenSettings: () => void;
}

export const LogicInspector: React.FC<LogicInspectorProps> = ({
  book,
  chapter,
  verse,
  geminiApiKey,
  lang = 'tl',
  onOpenSettings
}) => {
  const [analysis, setAnalysis] = useState<ExegesisAnalysis | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'logic' | 'original' | 'compare' | 'apologetics' | 'homiletics'>('logic');
  const [customQuestion, setCustomQuestion] = useState('');
  const [analysisResponse, setAnalysisResponse] = useState<string>('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const t = translations[lang] || translations.tl;

  useEffect(() => {
    if (verse) {
      const result = logicAnalyzerService.analyzePassage(book, chapter, verse, lang);
      setAnalysis(result);
      setAnalysisResponse('');
      setAnalysisError(null);
    } else {
      setAnalysis(null);
    }
  }, [book.id, chapter, verse?.v, lang]);

  if (!verse || !analysis) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <Brain size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          {t.noVerseSelected}
        </div>
        <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
          {t.noVerseSelectedSub}
        </p>
      </div>
    );
  }

  const handleRunAnalysis = async (mode: 'logic' | 'original' | 'compare' | 'apologetics' | 'homiletics') => {
    setAnalysisMode(mode);
    if (!geminiApiKey) {
      setAnalysisError(lang === 'en' ? 'Please set your Gemini API Key in Settings to run AI exegesis.' : 'Pakilagay ang iyong API Key sa Settings upang magamit ang malalimang pagsusuri.');
      return;
    }

    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const res = await logicAnalyzerService.generateAiExegesis(
        geminiApiKey,
        book,
        chapter,
        verse,
        mode,
        customQuestion.trim() || undefined,
        lang
      );
      setAnalysisResponse(res);
    } catch (err: any) {
      setAnalysisError(err.message || (lang === 'en' ? 'An error occurred during analysis.' : 'May naganap na error sa pagbuo ng pagsusuri.'));
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Passage Logic Header */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-gold)', fontWeight: 700 }}>
            {t.logicalExegesisHeader}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {analysis.reference}
          </div>
        </div>
        <span className="app-badge">{analysis.genre}</span>
      </div>

      {/* 1. Syllogistic Logical Decomposition */}
      <div className="logic-card">
        <div className="logic-card-header">
          <Brain size={18} />
          <span>{t.syllogismTitle}</span>
        </div>

        <div className="syllogism-box">
          <div className="syllogism-step">
            <span className="step-label">{t.majorPremiseLabel}</span>
            <p className="step-text">{analysis.syllogism.majorPremise}</p>
          </div>

          <div className="syllogism-step">
            <span className="step-label">{t.minorPremiseLabel}</span>
            <p className="step-text">{analysis.syllogism.minorPremise}</p>
          </div>

          <div className="syllogism-step">
            <span className="step-label">{t.conclusionLabel}</span>
            <p className="step-text" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
              {analysis.syllogism.conclusion}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          * {analysis.syllogism.validityNote}
        </div>
      </div>

      {/* 2. Discourse Connectives (Lohikal na Pang-ugnay) */}
      <div className="logic-card">
        <div className="logic-card-header">
          <Layers size={18} />
          <span>{t.connectivesTitle}</span>
        </div>

        {analysis.connectivesFound.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t.noConnectives}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {t.connectivesDesc}
            </div>
            <div className="connectives-container">
              {analysis.connectivesFound.map((c, idx) => (
                <div key={idx} className={`connective-chip ${c.type}`} title={c.meaning}>
                  <strong style={{ textTransform: 'capitalize' }}>{c.word}</strong>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({c.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Original Language & Nuances */}
      <div className="logic-card">
        <div className="logic-card-header">
          <BookOpen size={18} />
          <span>{t.originalNuancesTitle}</span>
        </div>

        <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {analysis.originalNuances.map((n, idx) => (
            <li key={idx} style={{ lineHeight: 1.5 }}>{n}</li>
          ))}
        </ul>
      </div>

      {/* 4. Interactive Exegesis Assistant Console */}
      <div className="logic-card" style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-card-hover)' }}>
        <div className="logic-card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} className="text-gold" />
            <span>{t.assistantTitle}</span>
          </div>
          {!geminiApiKey && (
            <button
              onClick={onOpenSettings}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-gold)',
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer'
              }}
            >
              {t.setApiKeyPrompt}
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          {t.assistantSub}
        </div>

        <div className="ai-actions-grid">
          <button 
            className={`ai-preset-btn ${analysisMode === 'logic' ? 'active' : ''}`}
            onClick={() => handleRunAnalysis('logic')}
            disabled={isLoadingAnalysis}
          >
            <Brain size={14} />
            <span>{t.btnStrictLogic}</span>
          </button>

          <button 
            className={`ai-preset-btn ${analysisMode === 'original' ? 'active' : ''}`}
            onClick={() => handleRunAnalysis('original')}
            disabled={isLoadingAnalysis}
          >
            <BookOpen size={14} />
            <span>{t.btnGreekHebrew}</span>
          </button>

          <button 
            className={`ai-preset-btn ${analysisMode === 'compare' ? 'active' : ''}`}
            onClick={() => handleRunAnalysis('compare')}
            disabled={isLoadingAnalysis}
          >
            <Layers size={14} />
            <span>{t.btnCompareTrans}</span>
          </button>

          <button 
            className={`ai-preset-btn ${analysisMode === 'apologetics' ? 'active' : ''}`}
            onClick={() => handleRunAnalysis('apologetics')}
            disabled={isLoadingAnalysis}
          >
            <HelpCircle size={14} />
            <span>{t.btnApologetics}</span>
          </button>
        </div>

        {/* Custom Question input */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder={t.questionPlaceholder}
            value={customQuestion}
            onChange={e => setCustomQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRunAnalysis(analysisMode);
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem'
            }}
          />
          <button
            onClick={() => handleRunAnalysis(analysisMode)}
            disabled={isLoadingAnalysis}
            className="action-icon-btn"
            style={{ background: 'var(--accent-gold)', color: '#000' }}
            title={t.btnRunAnalysis}
          >
            <Send size={14} />
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoadingAnalysis && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gold)', fontSize: '0.85rem' }}>
            {t.analyzingPassage} ({analysis.reference})...
          </div>
        )}

        {/* Error Message */}
        {analysisError && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px',
            fontSize: '0.8rem',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Output Result Box */}
        {analysisResponse && (
          <div className="ai-response-box">
            {analysisResponse}
          </div>
        )}
      </div>
    </div>
  );
};
