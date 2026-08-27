import { useState, useRef, useEffect } from 'react'
import RobotProfileImage from './assets/robot.png'
import UserProfileImage from './assets/user.png'
import { Header } from './components/Header'
import { AuthModal } from './components/AuthModal'
import { DeleteAccountModal } from './components/DeleteAccountModal'
import { Sidebar } from './components/Sidebar'
import { VoiceAssistantControls } from './components/VoiceAssistantControls'
import { RealTimeStatusModal } from './components/RealTimeStatusModal'
import { AIMemoryModal } from './components/AIMemoryModal'
import { PromptLibraryModal } from './components/PromptLibraryModal'
import { CodeAssistantModal } from './components/CodeAssistantModal'
import { MultiLanguageModal, SUPPORTED_LANGUAGES } from './components/MultiLanguageModal'
import { AnalyticsDashboardModal } from './components/AnalyticsDashboardModal'
import { GlobalSearchModal } from './components/GlobalSearchModal'
import { socketManager } from './socket'
import { EditIcon, PaperclipIcon, ImageIcon, PaletteIcon, GlobeIcon, CodeIcon, PromptIcon, MicIcon, SendIcon, StopIcon } from './components/Icons'
import './App.css'

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

function ChatInput({ onSendMessage, isLoading, onTypingStart, onTypingStop, selectedLanguage = 'en', onStopGeneration }) {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const typingTimerRef = useRef(null);
  const latestTranscriptRef = useRef('');

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (onTypingStart && val.trim()) {
      onTypingStart();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore stop errors */ }
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleSendDictatedPrompt = (textOverride) => {
    const textToSend = textOverride || latestTranscriptRef.current || inputText;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsListening(false);

    if (textToSend && textToSend.trim()) {
      const finalPrompt = textToSend.trim();
      latestTranscriptRef.current = '';
      setInputText('');
      onSendMessage(finalPrompt, attachments);
      setAttachments([]);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, Safari, or Brave.");
      return;
    }

    if (isListening) {
      handleSendDictatedPrompt();
      return;
    }

    try {
      latestTranscriptRef.current = '';
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Automatically stop after sentence ends so prompt generates and sends immediately
      recognition.interimResults = true;

      const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
      recognition.lang = targetLang ? targetLang.speechCode : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText(transcript);
          latestTranscriptRef.current = transcript;
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("Microphone permission was denied. Please enable microphone access in browser settings.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (latestTranscriptRef.current && latestTranscriptRef.current.trim()) {
          handleSendDictatedPrompt(latestTranscriptRef.current);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const getFileCategory = (name, mimeType) => {
    if (mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) return 'image';
    if (mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc')) return 'word';
    return 'text';
  };

  const processFiles = (files) => {
    files.forEach((file) => {
      if (file.size > 200 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 200MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        const cat = getFileCategory(file.name, file.type);
        const isImage = cat === 'image';

        setAttachments((prev) => [
          ...prev,
          {
            id: generateId(),
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            type: cat,
            data: base64Data,
            isImage: isImage
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter(att => att.id !== id));
  };

  const handleSend = () => {
    if (isLoading) {
      if (onStopGeneration) onStopGeneration();
      return;
    }
    if (!inputText.trim() && attachments.length === 0) return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore stop errors */ }
      setIsListening(false);
    }

    onSendMessage(inputText, attachments);
    setInputText('');
    setAttachments([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const hasDocAttached = attachments.some(a => a.type === 'pdf' || a.type === 'word' || a.type === 'text');

  return (
    <div
      className={`chat-input-wrapper ${isDragging ? 'dragging-over' : ''} ${isListening ? 'voice-listening-active' : ''} ${isLoading ? 'generating-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isListening && (
        <div className="listening-indicator-banner">
          <span className="pulse-mic-dot"></span>
          <span className="listening-banner-text">🎙️ Dictating prompt... Speak your question and it will generate as a prompt</span>
          <button type="button" className="btn-send-dictated-prompt" onClick={() => handleSendDictatedPrompt()}>
            Send Prompt 🚀
          </button>
          <button type="button" className="btn-stop-listening" onClick={() => {
            if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch { /* ignore */ }
            }
            setIsListening(false);
            latestTranscriptRef.current = '';
          }}>
            Cancel
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="attachments-preview-bar">
          {attachments.map((att) => (
            <div key={att.id} className="attachment-chip">
              {att.isImage ? (
                <img src={att.data} alt={att.name} className="chip-img-thumbnail" />
              ) : (
                <span className="chip-icon font-emoji">
                  {att.type === 'pdf' ? '📕' : att.type === 'word' ? '📘' : '📝'}
                </span>
              )}
              <div className="chip-info">
                <span className="chip-filename">{att.name}</span>
                <span className="chip-filesize">{(att.size / 1024).toFixed(1)} KB</span>
              </div>
              <button
                type="button"
                className="chip-remove-btn"
                onClick={() => removeAttachment(att.id)}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {hasDocAttached && (
        <div className="quick-suggestions-bar">
          <span className="suggestion-label">⚡ Suggestions:</span>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => {
              onSendMessage("What key information or skills are in this document?", attachments);
              setInputText('');
              setAttachments([]);
            }}
          >
            {'🎯 "Key information"'}
          </button>
          <button
            type="button"
            className="suggestion-chip"
            onClick={() => {
              onSendMessage("Summarize the key points and details from this document.", attachments);
              setInputText('');
              setAttachments([]);
            }}
          >
            {'📋 "Summarize document"'}
          </button>
        </div>
      )}

      <div className="chat-input-container">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          multiple
          accept=".pdf,.docx,.doc,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.gif"
        />
        <button
          type="button"
          className="attach-file-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload File (PDF, Image, Word, Text)"
        >
          <PaperclipIcon size={18} />
        </button>

        <button
          type="button"
          className="attach-file-btn image-prompt-trigger-btn"
          onClick={() => {
            if (!inputText.toLowerCase().startsWith('generate an image of')) {
              setInputText('Generate an image of ');
            }
            textInputRef.current?.focus();
          }}
          title="Generate AI Image (Click to insert 'Generate an image of ')"
        >
          <ImageIcon size={18} />
        </button>

        <button
          type="button"
          className={`mic-voice-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
          title={isListening ? "Listening... Click to stop" : "Voice Input (Speak to Chatbot)"}
        >
          <MicIcon size={18} />
        </button>

        <input
          ref={textInputRef}
          placeholder={isListening ? "Listening to your voice..." : attachments.length > 0 ? "Ask a question about uploaded file..." : "Ask anything..."}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          value={inputText}
          className="chat-input"
        />

        {isLoading ? (
          <button
            type="button"
            onClick={handleSend}
            className="send-button stop-button"
            title="Stop AI Generation"
          >
            <StopIcon size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="send-button"
            disabled={!inputText.trim() && attachments.length === 0}
            title="Send Message"
          >
            <SendIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function GeneratedImageCard({ alt, url, onOpenLightbox }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="generated-image-card">
      <div className="generated-image-card-header">
        <span className="img-badge font-emoji">🎨 AI Generated Image</span>
        <span className="img-hd-badge">1024x1024 HD</span>
      </div>

      <div className="generated-image-frame" onClick={() => onOpenLightbox && onOpenLightbox(url, alt)}>
        {loading && !error && (
          <div className="image-loading-skeleton">
            <div className="skeleton-spinner"></div>
            <span>Generating & loading high-res AI image...</span>
          </div>
        )}

        {error ? (
          <div className="image-error-box">
            <span>⚠️ Failed to load image preview. Click to view image link.</span>
            <a href={url} target="_blank" rel="noreferrer" className="btn-retry-image">
              Open Image Link ➔
            </a>
          </div>
        ) : (
          <img
            src={url}
            alt={alt || 'AI Generated Image'}
            className={`generated-img-element ${loading ? 'hidden' : 'visible'}`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}

        {!loading && !error && (
          <div className="img-hover-overlay">
            <span>🔍 Click for Fullscreen Lightbox</span>
          </div>
        )}
      </div>

      <div className="generated-image-card-footer">
        <button
          type="button"
          className="img-action-btn primary"
          onClick={() => onOpenLightbox && onOpenLightbox(url, alt)}
          title="Open in fullscreen view"
        >
          🔍 Lightbox
        </button>

        <button
          type="button"
          className="img-action-btn"
          onClick={handleDownload}
          title="Download image file to PC"
        >
          📥 Download
        </button>

        <button
          type="button"
          className="img-action-btn"
          onClick={handleCopy}
          title="Copy direct image link"
        >
          {copied ? '✓ Copied' : '🔗 Copy Link'}
        </button>
      </div>
    </div>
  );
}

function ImageLightboxModal({ isOpen, imageData, onClose }) {
  if (!isOpen || !imageData) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(imageData.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageData.url, '_blank');
    }
  };

  return (
    <div className="lightbox-modal-overlay" onClick={onClose}>
      <div className="lightbox-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-header">
          <div className="lightbox-title-box">
            <span className="lightbox-icon">🎨</span>
            <span className="lightbox-title">{imageData.title || 'AI Generated Image'}</span>
          </div>
          <div className="lightbox-header-actions">
            <button type="button" className="btn-lightbox-action" onClick={handleDownload} title="Download Image">
              📥 Download
            </button>
            <a href={imageData.url} target="_blank" rel="noreferrer" className="btn-lightbox-action" title="Open Link">
              🔗 External Link
            </a>
            <button type="button" className="btn-lightbox-close" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>
        <div className="lightbox-body">
          <img src={imageData.url} alt={imageData.title} className="lightbox-main-img" />
        </div>
      </div>
    </div>
  );
}

function formatBold(str) {
  if (typeof str !== 'string') return str;
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function FormattedMessage({ text, onOpenLightbox }) {
  if (!text) return null;
  if (text === '__loading__') return <span className="loading-spinner"></span>;

  // Split text into code blocks and normal text
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="formatted-message-content">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.substring(3, firstLineEnd > 0 ? firstLineEnd : 3).trim();
          const code = firstLineEnd > 0 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);

          return (
            <div key={index} className="ai-code-block">
              <div className="ai-code-header">
                <span className="code-lang">{lang || 'CODE'}</span>
                <button 
                  type="button"
                  className="btn-copy-code"
                  onClick={() => navigator.clipboard?.writeText(code.trim())}
                >
                  📋 Copy
                </button>
              </div>
              <pre className="ai-code-pre">
                <code>{code.trim()}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = part.split('\n\n');
        return (
          <div key={index} className="text-segment">
            {paragraphs.map((p, pIdx) => {
              if (!p.trim()) return null;

              // Check if paragraph is or contains a markdown image tag ![alt](url)
              const imgMatch = p.match(/!\[(.*?)\]\((.*?)\)/);
              if (imgMatch) {
                const alt = imgMatch[1];
                const url = imgMatch[2];
                const beforeText = p.substring(0, imgMatch.index).trim();
                const afterText = p.substring(imgMatch.index + imgMatch[0].length).trim();

                return (
                  <div key={pIdx} className="paragraph-image-block">
                    {beforeText && (
                      <p className="ai-paragraph">{formatBold(beforeText)}</p>
                    )}
                    <GeneratedImageCard alt={alt} url={url} onOpenLightbox={onOpenLightbox} />
                    {afterText && (
                      <p className="ai-paragraph">{formatBold(afterText)}</p>
                    )}
                  </div>
                );
              }

              if (p.startsWith('### ')) {
                return <h4 key={pIdx} className="ai-heading">{formatBold(p.substring(4))}</h4>;
              }
              if (p.startsWith('## ')) {
                return <h3 key={pIdx} className="ai-heading">{formatBold(p.substring(3))}</h3>;
              }
              if (p.startsWith('# ')) {
                return <h2 key={pIdx} className="ai-heading">{formatBold(p.substring(2))}</h2>;
              }

              const lines = p.split('\n');
              return (
                <p key={pIdx} className="ai-paragraph">
                  {lines.map((line, lIdx) => (
                    <span key={lIdx}>
                      {formatBold(line)}
                      {lIdx < lines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FileBadge({ attachment }) {
  const getIcon = () => {
    if (attachment.isImage) return '🖼️';
    if (attachment.type === 'pdf' || attachment.mimeType?.includes('pdf')) return '📕';
    if (attachment.type === 'word' || attachment.mimeType?.includes('word')) return '📘';
    return '📝';
  };

  return (
    <div className="message-attachment-card">
      {attachment.isImage && attachment.data ? (
        <div className="attached-image-wrapper">
          <img src={attachment.data} alt={attachment.name} className="attached-img-preview" />
          <span className="attached-img-name">{attachment.name}</span>
        </div>
      ) : (
        <div className="attached-doc-wrapper">
          <span className="doc-icon font-emoji">{getIcon()}</span>
          <div className="doc-meta">
            <span className="doc-name">{attachment.name}</span>
            <span className="doc-badge-type">{attachment.type ? attachment.type.toUpperCase() : 'FILE'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatMessage({ message, sender, user, attachments, msgId, onSpeak, onStopSpeech, isSpeaking, onOpenLightbox, onTranslateMessage, isTranslating, selectedLanguage }) {
  return (
    <div className={sender === 'user' ? 'chat-message-user' : 'chat-message-robot'}>
      {sender === 'robot' && (<img src={RobotProfileImage} className="chat-message-profile" alt="Robot Profile" />)}
      <div className="chat-message-text">
        {Array.isArray(attachments) && attachments.length > 0 && (
          <div className="message-attachments-container">
            {attachments.map((att, i) => (
              <FileBadge key={att.id || i} attachment={att} />
            ))}
          </div>
        )}
        <FormattedMessage text={message} onOpenLightbox={onOpenLightbox} />
        {sender === 'robot' && message !== '__loading__' && (
          <div className="message-voice-toolbar">
            {isSpeaking ? (
              <button
                type="button"
                className="btn-read-aloud speaking"
                onClick={onStopSpeech}
                title="Stop speaking response"
              >
                <span className="sound-wave-icon">
                  <span className="bar bar1"></span>
                  <span className="bar bar2"></span>
                  <span className="bar bar3"></span>
                </span>
                <span>⏹️ Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-read-aloud"
                onClick={() => onSpeak(message, msgId)}
                title="Read response aloud"
              >
                🔊 Read Aloud
              </button>
            )}

            <button
              type="button"
              className={`btn-read-aloud ${isTranslating ? 'speaking' : ''}`}
              onClick={() => onTranslateMessage && onTranslateMessage(msgId, message, selectedLanguage || 'en')}
              title="Translate message to English or your selected language"
              disabled={isTranslating}
            >
              {isTranslating ? '⏳ Translating...' : '🌐 Translate to English'}
            </button>
          </div>
        )}
      </div>
      {sender === 'user' && (
        <div className="user-profile-wrapper">
          {user ? (
            <div className="user-avatar-small" title={user.username || user.name || user.email || 'User'}>
              {(user.username || user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          ) : (
            <img src={UserProfileImage} className="chat-message-profile" alt="User Profile" />
          )}
        </div>
      )}
    </div>
  );
}

function TypingIndicator({ isBotTyping, typingUsers }) {
  if (!isBotTyping && (!typingUsers || typingUsers.length === 0)) return null;

  return (
    <div className="typing-indicator-wrapper">
      {isBotTyping && (
        <div className="chat-message-robot typing-bubble">
          <img src={RobotProfileImage} className="chat-message-profile" alt="Robot Profile" />
          <div className="typing-dots-card">
            <span className="typing-bot-label">🤖 AI Assistant is typing</span>
            <div className="typing-bounce-dots">
              <span className="dot dot1"></span>
              <span className="dot dot2"></span>
              <span className="dot dot3"></span>
            </div>
          </div>
        </div>
      )}

      {!isBotTyping && typingUsers && typingUsers.length > 0 && (
        <div className="user-typing-bar">
          <span className="user-typing-icon font-emoji">✍️</span>
          <span className="user-typing-text">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
          <div className="typing-bounce-dots mini">
            <span className="dot dot1"></span>
            <span className="dot dot2"></span>
            <span className="dot dot3"></span>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatMessages({ chatMessages, user, onOpenAuth, onSpeak, onStopSpeech, speakingMsgId, isBotTyping, typingUsers, onSelectPrompt, onOpenPromptLibrary, onOpenCodeAssistant, onOpenLightbox, onTranslateMessage, translatingMsgId, selectedLanguage }) {
  const chatMessagesRef = useRef(null);
  useEffect(() => {
    const containerElem = chatMessagesRef.current;
    if (containerElem) {
      containerElem.scrollTop = containerElem.scrollHeight;
    }
  }, [chatMessages, isBotTyping, typingUsers]);

  return (
    <div className="chat-messages-container" ref={chatMessagesRef}>
      {!user && (
        <div className="guest-banner">
          <span>🔒 You are chatting as a guest. </span>
          <button className="banner-link" onClick={() => onOpenAuth('signup')}>
            Create an Account
          </button>
          <span> or </span>
          <button className="banner-link" onClick={() => onOpenAuth('login')}>
            Log In
          </button>
          <span> to save your chat history!</span>
        </div>
      )}

      {chatMessages.length === 0 && (
        <div className="welcome-hero-container">
          <div className="ai-identity-badge">✦ AI ASSISTANT</div>
          <h2 className="welcome-hero-headline">What&apos;s on the agenda today?</h2>
          <p className="welcome-hero-subtitle">Your intelligent workspace for ideas, research, coding, creativity and productivity.</p>

          <div className="welcome-hero-chips-grid">
            <button
              type="button"
              className="hero-chip-card"
              onClick={() => onSelectPrompt("Generate an image of a majestic landscape at sunset")}
              title="Create an AI image using vision models"
            >
              <span className="hero-chip-icon"><PaletteIcon size={16} /></span>
              <span className="hero-chip-label">Create an image</span>
            </button>

            <button
              type="button"
              className="hero-chip-card"
              onClick={() => onSelectPrompt("Write a clean, professional document regarding a project update")}
              title="Draft or edit documents and text"
            >
              <span className="hero-chip-icon"><EditIcon size={16} /></span>
              <span className="hero-chip-label">Write or edit</span>
            </button>

            <button
              type="button"
              className="hero-chip-card"
              onClick={() => onSelectPrompt("/web Search the web for latest AI breakthroughs")}
              title="Search live web search results"
            >
              <span className="hero-chip-icon"><GlobeIcon size={16} /></span>
              <span className="hero-chip-label">Search the web</span>
            </button>

            <button
              type="button"
              className="hero-chip-card"
              onClick={() => (onOpenCodeAssistant ? onOpenCodeAssistant() : onSelectPrompt("Help me debug and optimize this code"))}
              title="Open specialized Code AI Assistant"
            >
              <span className="hero-chip-icon"><CodeIcon size={16} /></span>
              <span className="hero-chip-label">Code & debug</span>
            </button>

            <button
              type="button"
              className="hero-chip-card"
              onClick={onOpenPromptLibrary}
              title="Browse pre-built prompt templates"
            >
              <span className="hero-chip-icon"><PromptIcon size={16} /></span>
              <span className="hero-chip-label">Browse prompts</span>
            </button>
          </div>
        </div>
      )}

      {chatMessages.map((chatMessage) => {
        return (
          <ChatMessage
            key={chatMessage.id}
            msgId={chatMessage.id}
            message={chatMessage.message}
            sender={chatMessage.sender}
            user={user}
            attachments={chatMessage.attachments}
            onSpeak={onSpeak}
            onStopSpeech={onStopSpeech}
            isSpeaking={speakingMsgId === chatMessage.id}
            onOpenLightbox={onOpenLightbox}
            onTranslateMessage={onTranslateMessage}
            isTranslating={translatingMsgId === chatMessage.id}
            selectedLanguage={selectedLanguage}
          />
        );
      })}

      <TypingIndicator isBotTyping={isBotTyping} typingUsers={typingUsers} />
    </div>
  );
}

function App() {
  const [chatMessages, setChatMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [selectedModel, setSelectedModel] = useState('auto');
  const [themeChoice, setThemeChoice] = useState(() => {
    return localStorage.getItem('chatbot_theme') || 'system';
  });

  // Lightbox State (Phase 13 Image Generation)
  const [lightboxData, setLightboxData] = useState(null);

  // Voice Assistant State
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('chatbot_auto_speak') === 'true';
  });
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  const [isBottom, setIsBottom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chatbot_token') || null);
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('chatbot_saved_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('chatbot_saved_accounts', JSON.stringify(savedAccounts));
    } catch (e) {
      console.warn('Failed to save accounts to localStorage:', e);
    }
  }, [savedAccounts]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteAccount, setTargetDeleteAccount] = useState(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  // Socket.io Real-Time State (Phase 9)
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isRealTimeModalOpen, setIsRealTimeModalOpen] = useState(false);
  const [pingLatency, setPingLatency] = useState(0);

  // AI Memory State (Phase 10)
  const [memories, setMemories] = useState([]);
  const [mongoStatus, setMongoStatus] = useState({});
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [memoryToast, setMemoryToast] = useState(null);

  // Prompt Library State (Phase 11)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Code Assistant State (Phase 12)
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Multi-Language State (Phase 14)
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('chatbot_language') || 'en');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  // Analytics Dashboard & Admin Panel State (Phase 15)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Universal Search & Command Palette State (Phase 16)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [translatingMsgId, setTranslatingMsgId] = useState(null);
  const [originalMessagesMap, setOriginalMessagesMap] = useState({});

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTranslateMessage = async (msgId, textContent, targetLang = 'en') => {
    try {
      // Toggle back if already translated
      if (originalMessagesMap[msgId]) {
        const originalText = originalMessagesMap[msgId];
        setChatMessages(prev =>
          prev.map(m => m.id === msgId ? { ...m, message: originalText } : m)
        );
        setOriginalMessagesMap(prev => {
          const copy = { ...prev };
          delete copy[msgId];
          return copy;
        });
        return;
      }

      setTranslatingMsgId(msgId);
      const chosenTarget = targetLang || selectedLanguage || 'en';
      const res = await fetch('/api/chat/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textContent, targetLanguage: chosenTarget })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setOriginalMessagesMap(prev => ({ ...prev, [msgId]: textContent }));
          setChatMessages(prev =>
            prev.map(m => m.id === msgId ? { ...m, message: data.translatedText } : m)
          );
        }
      }
    } catch (err) {
      console.error('Failed to translate message:', err);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  const fetchMemories = async () => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/chat/memory', { headers });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
        setMongoStatus(data.mongoStatus || {});
      }
    } catch (err) {
      console.warn('Failed to fetch memories:', err);
    }
  };

  useEffect(() => {
    fetchMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const handleAddMemory = async ({ key, value, category }) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/chat/memory', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value, category })
      });
      if (res.ok) {
        fetchMemories();
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/chat/memory/${memoryId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchMemories();
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAllMemories = async () => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/chat/memory', {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchMemories();
      }
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  // Setup Socket.io Event Subscriptions
  useEffect(() => {
    socketManager.connect(token);

    const unsubConn = socketManager.subscribe('socket:connected', (data) => {
      setSocketConnected(true);
      if (data && data.onlineCount) setOnlineCount(data.onlineCount);
    });

    const unsubUsers = socketManager.subscribe('online_users_update', (data) => {
      setOnlineUsers(data.users || []);
      setOnlineCount(data.count || 1);
    });

    const unsubUserTypingStart = socketManager.subscribe('user_typing_start', (data) => {
      if (data && data.username) {
        setTypingUsers(prev => Array.from(new Set([...prev, data.username])));
      }
    });

    const unsubUserTypingStop = socketManager.subscribe('user_typing_stop', (data) => {
      if (data && data.username) {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    const unsubBotTypingStart = socketManager.subscribe('bot_typing_start', () => {
      setIsBotTyping(true);
    });

    const unsubBotTypingStop = socketManager.subscribe('bot_typing_stop', () => {
      setIsBotTyping(false);
    });

    return () => {
      unsubConn();
      unsubUsers();
      unsubUserTypingStart();
      unsubUserTypingStop();
      unsubBotTypingStart();
      unsubBotTypingStop();
    };
  }, [token]);

  const handleTypingStart = () => {
    socketManager.emitTypingStart(activeConvId);
  };

  const handleTypingStop = () => {
    socketManager.emitTypingStop(activeConvId);
  };

  // Load available speech synthesis voices
  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0) {
          const defaultVoice = voices.find(v => v.default || v.lang.startsWith('en')) || voices[0];
          setSelectedVoice(prev => prev || defaultVoice);
        }
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleToggleAutoSpeak = (val) => {
    setAutoSpeak(val);
    localStorage.setItem('chatbot_auto_speak', val ? 'true' : 'false');
  };

  const stripMarkdown = (txt) => {
    if (typeof txt !== 'string') return '';
    return txt
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s*(.*?)\n/g, '$1. ')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\n+/g, ' ');
  };

  const handleSpeakMessage = (text, msgId) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    window.speechSynthesis.cancel();

    if (speakingMsgId === msgId) {
      setSpeakingMsgId(null);
      return;
    }

    const cleanText = stripMarkdown(text);
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    utterance.onstart = () => {
      setSpeakingMsgId(msgId);
    };
    utterance.onend = () => {
      setSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  };

  // Apply Theme (Dark, Light, System)
  useEffect(() => {
    const applyTheme = (choice) => {
      let activeTheme = choice;
      if (choice === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
    };

    applyTheme(themeChoice);
    localStorage.setItem('chatbot_theme', themeChoice);

    if (themeChoice === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeChoice]);

  // Initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('chatbot_token');
    if (storedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((data) => {
          setUser(data.user);
          setToken(storedToken);
          fetchConversations(storedToken);
        })
        .catch(() => {
          localStorage.removeItem('chatbot_token');
          setUser(null);
          setToken(null);
        });
    }
  }, []);

  const fetchConversations = async (authToken, search = '') => {
    try {
      const res = await fetch(`/api/chat/conversations?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (token) {
      fetchConversations(token, query);
    }
  };

  const fetchSpecificConversation = async (convId, authToken) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        if (conv && conv.messages) {
          // Flatten messages for UI
          const flattened = [];
          conv.messages.forEach(m => {
            flattened.push({
              id: m.id + '-q',
              sender: 'user',
              message: m.question,
              attachments: m.attachments || []
            });
            flattened.push({ id: m.id + '-a', sender: 'robot', message: m.answer });
          });
          setChatMessages(flattened);
        }
      }
    } catch (err) {
      console.error('Error fetching conversation details:', err);
    }
  };

  const handleSelectConversation = (convId) => {
    setActiveConvId(convId);
    if (token) {
      fetchSpecificConversation(convId, token);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setChatMessages([]);
    handleStopSpeech();
  };

  const handleRenameConversation = async (convId, newTitle) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        fetchConversations(token, searchQuery);
      }
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  };

  const handleDeleteConversation = async (convId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        if (activeConvId === convId) {
          handleNewChat();
        }
        fetchConversations(token, searchQuery);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleClearCurrentChat = () => {
    if (chatMessages.length === 0 && !activeConvId) return;
    if (window.confirm('Are you sure you want to clear current chat messages?')) {
      if (activeConvId && token) {
        handleDeleteConversation(activeConvId);
      } else {
        handleNewChat();
      }
    }
  };

  const handleClearAllConversations = async () => {
    handleNewChat();
    setConversations([]);
    if (token) {
      try {
        const res = await fetch('/api/chat/conversations', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          fetchConversations(token, searchQuery);
        }
      } catch (err) {
        console.error('Failed to clear all conversations:', err);
      }
    }
  };

  const handleStopGeneration = () => {
    setIsLoading(false);
    setChatMessages(prev => prev.filter(m => m.id !== 'loading-message' && m.message !== '__loading__'));
  };

  const handleSendMessage = async (inputText, attachments = []) => {
    if (!inputText.trim() && attachments.length === 0) return;

    handleStopSpeech();

    const userMsg = {
      message: inputText,
      sender: 'user',
      attachments: attachments,
      id: generateId()
    };

    const newChatMessages = [...chatMessages, userMsg];
    setChatMessages(newChatMessages);
    setIsLoading(true);

    const loadingChatMessages = [
      ...newChatMessages,
      {
        message: '__loading__',
        sender: 'robot',
        id: 'loading-message'
      }
    ];
    setChatMessages(loadingChatMessages);

    // Fetch AI generated response from server
    let response = '';
    try {
      const historyContext = chatMessages
        .filter(m => m.message !== '__loading__')
        .reduce((acc, curr, idx, arr) => {
          if (curr.sender === 'user' && arr[idx + 1] && arr[idx + 1].sender === 'robot') {
            acc.push({ question: curr.message, answer: arr[idx + 1].message });
          }
          return acc;
        }, []);

      const generateHeaders = { 'Content-Type': 'application/json' };
      if (token) generateHeaders['Authorization'] = `Bearer ${token}`;

      const aiRes = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: generateHeaders,
        body: JSON.stringify({
          prompt: inputText,
          history: historyContext,
          attachments: attachments,
          model: selectedModel,
          targetLanguage: selectedLanguage
        })
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        response = data.response;
        if (Array.isArray(data.newMemories) && data.newMemories.length > 0) {
          const memDetails = data.newMemories.map(m => `${m.key} = "${m.value}"`).join(', ');
          setMemoryToast(`🧠 AI remembered: ${memDetails} (Saved to MongoDB)`);
          setTimeout(() => setMemoryToast(null), 5000);
          fetchMemories();
        }
      } else {
        response = '⚠️ Server encountered an error processing your request. Please try again or check backend server logs.';
      }
    } catch (err) {
      console.warn('AI generation endpoint failed:', err);
      response = '⚠️ Network connection issue. Unable to communicate with AI server.';
    }

    const robotMsgId = generateId();
    const finalMessages = [
      ...newChatMessages,
      {
        message: response,
        sender: 'robot',
        id: robotMsgId
      }
    ];

    setChatMessages(finalMessages);
    setIsLoading(false);

    // If Auto Speak is enabled, automatically speak response
    if (autoSpeak) {
      handleSpeakMessage(response, robotMsgId);
    }

    // Save to server if logged in
    if (token) {
      try {
        let endpoint = '/api/chat/conversations';
        let currentConvId = activeConvId;
        
        if (currentConvId) {
          endpoint = `/api/chat/conversations/${currentConvId}/messages`;
        } else {
          // Create new chat and add first message
          const title = inputText.trim()
            ? (inputText.substring(0, 30) + (inputText.length > 30 ? '...' : ''))
            : (attachments[0] ? `File: ${attachments[0].name}` : 'New Chat');

          const createRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title })
          });
          const createData = await createRes.json();
          currentConvId = createData.conversation.id;
          setActiveConvId(currentConvId);
          endpoint = `/api/chat/conversations/${currentConvId}/messages`;
        }

        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            question: inputText,
            answer: response,
            attachments: attachments
          })
        });
        
        // Refresh conversations list to update titles/timestamps
        fetchConversations(token, searchQuery);
        
      } catch (err) {
        console.error('Failed to save message to server:', err);
      }
    }
  };

  const handleOpenAuth = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('chatbot_token', authToken);

    setSavedAccounts(prev => {
      const filtered = prev.filter(acc => acc.user.id !== userData.id && acc.user.email !== userData.email);
      return [{ user: userData, token: authToken, lastActive: new Date().toISOString() }, ...filtered];
    });

    socketManager.updateAuthToken(authToken, userData);
    fetchConversations(authToken);
    fetchMemories();
    setIsAuthModalOpen(false);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchAccount = (accountToSwitch) => {
    if (!accountToSwitch) return;

    setIsSwitchingAccount(true);

    const newUserData = accountToSwitch.user || accountToSwitch;
    const newToken = accountToSwitch.token || localStorage.getItem('chatbot_token') || null;

    setUser(newUserData);
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('chatbot_token', newToken);
    }

    setSavedAccounts(prev => {
      return prev.map(acc => {
        if ((acc.user && acc.user.id === newUserData.id) || acc.token === newToken) {
          return { ...acc, user: newUserData, token: newToken, lastActive: new Date().toISOString() };
        }
        return acc;
      });
    });

    socketManager.updateAuthToken(newToken, newUserData);
    fetchConversations(newToken);
    fetchMemories();
    setActiveConvId(null);
    setChatMessages([]);

    setTimeout(() => {
      setIsSwitchingAccount(false);
    }, 1200);
  };

  const handleLogoutAccount = (accountToLogout) => {
    const targetUserId = accountToLogout?.user?.id || user?.id;
    const remaining = savedAccounts.filter(acc => acc.user.id !== targetUserId);
    setSavedAccounts(remaining);

    if (user && user.id === targetUserId) {
      if (remaining.length > 0) {
        handleSwitchAccount(remaining[0]);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('chatbot_token');
        setChatMessages([]);
        setConversations([]);
        setActiveConvId(null);
        handleStopSpeech();
      }
    }
  };

  const handleLogoutAllAccounts = () => {
    setSavedAccounts([]);
    setUser(null);
    setToken(null);
    localStorage.removeItem('chatbot_token');
    localStorage.removeItem('chatbot_saved_accounts');
    setChatMessages([]);
    setConversations([]);
    setActiveConvId(null);
    handleStopSpeech();
  };

  const handleLogout = () => {
    handleLogoutAccount({ user });
  };

  const handleOpenDeleteAccount = (targetAcc = null) => {
    setTargetDeleteAccount(targetAcc || null);
    setIsDeleteModalOpen(true);
  };

  const handleAccountDeleted = (deletedAccount) => {
    const deletedId = deletedAccount?.user?.id || deletedAccount?.user?.email || user?.id;
    const deletedEmail = deletedAccount?.user?.email;

    const remaining = savedAccounts.filter(acc => {
      const accId = acc.user?.id;
      const accEmail = acc.user?.email;
      if (deletedId && accId && accId === deletedId) return false;
      if (deletedEmail && accEmail && accEmail === deletedEmail) return false;
      return true;
    });
    setSavedAccounts(remaining);

    // Check if the currently active user was the one deleted
    const isActiveUserDeleted = user && (
      (user.id && deletedId && user.id === deletedId) ||
      (user.email && deletedEmail && user.email === deletedEmail)
    );

    if (isActiveUserDeleted) {
      if (remaining.length > 0) {
        handleSwitchAccount(remaining[0]);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('chatbot_token');
        setChatMessages([]);
        setConversations([]);
        setActiveConvId(null);
        handleStopSpeech();
      }
    }

    setIsDeleteModalOpen(false);
    setTargetDeleteAccount(null);
  };

  return (
    <div className="app-root">
      <div className="main-layout-wrapper">
        <Sidebar
          conversations={conversations}
          activeConvId={activeConvId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearAllConversations={handleClearAllConversations}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          isOpen={isSidebarOpen}
          user={user}
          savedAccounts={savedAccounts}
          onSwitchAccount={handleSwitchAccount}
          onAddAccount={() => handleOpenAuth('login')}
          onOpenAuth={handleOpenAuth}
          onLogoutAccount={handleLogoutAccount}
          onLogoutAllAccounts={handleLogoutAllAccounts}
          onOpenDeleteAccount={handleOpenDeleteAccount}
          themeChoice={themeChoice}
          onSelectTheme={setThemeChoice}
          onlineUsers={onlineUsers}
          onlineCount={onlineCount}
          onOpenRealTimeModal={() => setIsRealTimeModalOpen(true)}
        />

        <div className="chat-viewport">
          <Header
            user={user}
            savedAccounts={savedAccounts}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={() => handleOpenAuth('login')}
            onLogoutAccount={handleLogoutAccount}
            onLogoutAllAccounts={handleLogoutAllAccounts}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            themeChoice={themeChoice}
            onSelectTheme={setThemeChoice}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            onOpenDeleteAccount={handleOpenDeleteAccount}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            activeTitle={activeConvId ? conversations.find(c => c.id === activeConvId)?.title : 'New Chat'}
            onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
            autoSpeak={autoSpeak}
            onlineCount={onlineCount}
            socketConnected={socketConnected}
            onOpenRealTimeModal={() => setIsRealTimeModalOpen(true)}
            onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
            memoryCount={memories.length}
            onOpenPromptLibrary={() => setIsPromptModalOpen(true)}
            onOpenCodeAssistant={() => setIsCodeModalOpen(true)}
            onClearCurrentChat={handleClearCurrentChat}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={(code) => {
              setSelectedLanguage(code);
              localStorage.setItem('chatbot_language', code);
            }}
            onOpenMultiLanguageModal={() => setIsLangModalOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
            onOpenSearch={() => setIsSearchModalOpen(true)}
          />

          {memoryToast && (
            <div className="memory-toast-banner" onClick={() => setIsMemoryModalOpen(true)}>
              <span>{memoryToast}</span>
              <button type="button" className="btn-view-memory-toast">View Memory 🧠</button>
            </div>
          )}

          {!isBottom && (
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              selectedLanguage={selectedLanguage}
              onStopGeneration={handleStopGeneration}
            />
          )}

          <ChatMessages
            chatMessages={chatMessages}
            user={user}
            onOpenAuth={handleOpenAuth}
            onSpeak={handleSpeakMessage}
            onStopSpeech={handleStopSpeech}
            speakingMsgId={speakingMsgId}
            isBotTyping={isBotTyping}
            typingUsers={typingUsers}
            onSelectPrompt={(text) => {
              if (!isLoading) handleSendMessage(text, []);
            }}
            onOpenPromptLibrary={() => setIsPromptModalOpen(true)}
            onOpenCodeAssistant={() => setIsCodeModalOpen(true)}
            onOpenLightbox={(url, title) => setLightboxData({ url, title })}
            onTranslateMessage={handleTranslateMessage}
            translatingMsgId={translatingMsgId}
            selectedLanguage={selectedLanguage}
          />

          {isBottom && (
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              selectedLanguage={selectedLanguage}
              onStopGeneration={handleStopGeneration}
            />
          )}

          <div className="position-change">
            <a className="link" onClick={() => setIsBottom(!isBottom)}>
              {isBottom ? 'Move textbox to top' : 'Move textbox to bottom'}
            </a>
          </div>
        </div>
      </div>

      <ImageLightboxModal
        isOpen={Boolean(lightboxData)}
        imageData={lightboxData}
        onClose={() => setLightboxData(null)}
      />

      <VoiceAssistantControls
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
        speechRate={speechRate}
        onChangeSpeechRate={setSpeechRate}
        speechPitch={speechPitch}
        onChangeSpeechPitch={setSpeechPitch}
        availableVoices={availableVoices}
      />

      <RealTimeStatusModal
        isOpen={isRealTimeModalOpen}
        onClose={() => setIsRealTimeModalOpen(false)}
        socketConnected={socketConnected}
        onlineUsers={onlineUsers}
        onlineCount={onlineCount}
        pingLatency={pingLatency}
        user={user}
        onCheckPing={(cb) => {
          socketManager.measurePing((lat) => {
            setPingLatency(lat);
            if (typeof cb === 'function') cb(lat);
          });
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        onAuthSuccess={handleAuthSuccess}
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTargetDeleteAccount(null);
        }}
        user={user}
        token={token}
        savedAccounts={savedAccounts}
        targetAccount={targetDeleteAccount}
        onAccountDeleted={handleAccountDeleted}
      />

      <AIMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memories={memories}
        mongoStatus={mongoStatus}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onClearAllMemories={handleClearAllMemories}
      />

      <PromptLibraryModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSelectPrompt={(text) => handleSendMessage(text, [])}
      />

      <CodeAssistantModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onSendToChat={(text) => handleSendMessage(text, [])}
        selectedModel={selectedModel}
      />

      <MultiLanguageModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={(code) => {
          setSelectedLanguage(code);
          localStorage.setItem('chatbot_language', code);
        }}
      />

      <AnalyticsDashboardModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        token={token}
        onSelectConversation={(convId) => {
          handleSelectConversation(convId);
          setIsSearchModalOpen(false);
        }}
        onSelectPrompt={(text) => {
          if (!isLoading) handleSendMessage(text, []);
          setIsSearchModalOpen(false);
        }}
        onRunCommand={(cmdStr) => {
          const cmd = cmdStr.toLowerCase();
          if (cmd === '/code') setIsCodeModalOpen(true);
          else if (cmd === '/translate') setIsLangModalOpen(true);
          else if (cmd === '/memory') setIsMemoryModalOpen(true);
          else if (cmd === '/voice') setIsVoiceModalOpen(true);
          else if (cmd === '/prompt') setIsPromptModalOpen(true);
          else if (cmd === '/analytics') setIsAnalyticsModalOpen(true);
          else if (cmd === '/clear') handleClearCurrentChat();
          else if (!isLoading) handleSendMessage(`${cmdStr} `, []);
          setIsSearchModalOpen(false);
        }}
        onOpenMemoryModal={() => {
          setIsMemoryModalOpen(true);
          setIsSearchModalOpen(false);
        }}
      />

      {isSwitchingAccount && (
        <div className="switching-accounts-overlay">
          <div className="switching-spinner"></div>
          <div className="switching-title">Switching accounts</div>
          <div className="switching-subtitle">Please wait</div>
        </div>
      )}
    </div>
  );
}

export default App;
