import { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import './MultiLanguageModal.css';

export { SUPPORTED_LANGUAGES };

export function MultiLanguageModal({ isOpen, onClose, selectedLanguage, onSelectLanguage }) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = SUPPORTED_LANGUAGES.filter(
    l => l.name.toLowerCase().includes(search.toLowerCase()) ||
         l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
         l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="lang-modal-overlay" onClick={onClose}>
      <div className="lang-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="lang-modal-header">
          <div className="lang-modal-title">
            <span className="lang-title-icon">🌐</span>
            <div>
              <h2>Multi-Language Settings <span className="phase-pill">Phase 14</span></h2>
              <p className="lang-subtitle">Select your preferred native language for AI responses & voice input</p>
            </div>
          </div>
          <button type="button" className="lang-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="lang-search-bar">
          <span className="lang-search-icon">🔍</span>
          <input
            type="text"
            className="lang-search-input"
            placeholder="Search 16+ internationally recognized languages (e.g. Hindi, French, Spanish)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button type="button" className="btn-clear-lang-search" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="lang-modal-body">
          <div className="lang-grid">
            {filtered.map((lang) => {
              const isSelected = (selectedLanguage || 'en') === lang.code;
              return (
                <div
                  key={lang.code}
                  className={`lang-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectLanguage(lang.code);
                    onClose();
                  }}
                >
                  <div className="lang-card-top">
                    <span className="lang-flag">{lang.flag}</span>
                    <div className="lang-names">
                      <span className="lang-name-en">{lang.name}</span>
                      <span className="lang-name-native">{lang.nativeName}</span>
                    </div>
                    {isSelected && <span className="lang-selected-check">✓ Active</span>}
                  </div>
                  <p className="lang-desc">{lang.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lang-modal-footer">
          <span>💡 Voice speech input (🎤) and AI text output automatically adapt to your selected language!</span>
        </div>
      </div>
    </div>
  );
}
