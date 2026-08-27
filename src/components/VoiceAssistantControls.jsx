import './VoiceAssistantControls.css';

export function VoiceAssistantControls({
  isOpen,
  onClose,
  autoSpeak,
  onToggleAutoSpeak,
  selectedVoice,
  onSelectVoice,
  speechRate,
  onChangeSpeechRate,
  speechPitch,
  onChangeSpeechPitch,
  availableVoices = []
}) {
  if (!isOpen) return null;

  return (
    <div className="voice-modal-overlay" onClick={onClose}>
      <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="voice-modal-header">
          <div className="voice-title-group">
            <span className="voice-modal-icon">🎙️</span>
            <h3>Voice Assistant Settings</h3>
          </div>
          <button className="voice-modal-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="voice-modal-body">
          {/* Auto Speak Toggle */}
          <div className="voice-setting-row">
            <div className="setting-info">
              <label htmlFor="auto-speak-toggle" className="setting-label">Auto-Speak AI Responses</label>
              <span className="setting-desc">Bot automatically reads out responses when received</span>
            </div>
            <label className="toggle-switch">
              <input
                id="auto-speak-toggle"
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => onToggleAutoSpeak(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Voice Selector */}
          <div className="voice-setting-group">
            <label className="setting-label">Voice Accent / Speaker</label>
            <select
              className="voice-select-dropdown"
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                const chosen = availableVoices.find(v => v.name === e.target.value);
                if (chosen) onSelectVoice(chosen);
              }}
            >
              {availableVoices.length === 0 && <option value="">Default System Voice</option>}
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang}) {v.default ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Speech Rate Slider */}
          <div className="voice-setting-group">
            <div className="slider-label-row">
              <label className="setting-label">Speech Speed / Rate</label>
              <span className="slider-value-badge">{speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => onChangeSpeechRate(parseFloat(e.target.value))}
              className="voice-slider"
            />
          </div>

          {/* Speech Pitch Slider */}
          <div className="voice-setting-group">
            <div className="slider-label-row">
              <label className="setting-label">Voice Pitch</label>
              <span className="slider-value-badge">{speechPitch}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speechPitch}
              onChange={(e) => onChangeSpeechPitch(parseFloat(e.target.value))}
              className="voice-slider"
            />
          </div>

          {/* Quick info feature highlight */}
          <div className="voice-features-tip">
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <strong>Tip:</strong> Click the microphone 🎤 icon next to the chat box to speak your prompt, or click 🔊 Read Aloud on any message!
            </div>
          </div>
        </div>

        <div className="voice-modal-footer">
          <button className="btn-voice-done" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
