import { useState, useEffect, useRef, useCallback } from 'react';
import './GlobalSearchModal.css';

export function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectConversation,
  onSelectPrompt,
  onRunCommand,
  onOpenMemoryModal,
  token
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'chats' | 'files' | 'prompts' | 'commands' | 'memories'
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState({
    chats: [],
    files: [],
    prompts: [],
    commands: [],
    memories: []
  });

  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  const handleCopyResults = () => {
    const textToCopy = `Phase 16 - Search Feature\n\n- Previous Chats (${results.chats?.length || 0})\n- Uploaded Files (${results.files?.length || 0})\n- Saved Prompts (${results.prompts?.length || 0})\n- Commands (${results.commands?.length || 0})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fetchSearchResults = useCallback(async (q) => {
    try {
      setLoading(true);
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/chat/search?q=${encodeURIComponent(q)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.results) {
          setResults(json.results);
        }
      }
    } catch (err) {
      console.warn('Search query failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchSearchResults(query);
    } else {
      setQuery('');
      setActiveCategory('all');
    }
  }, [isOpen, query, fetchSearchResults]);

  // Debounced search on typing
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    fetchSearchResults(val);
  };

  const handleScrollDown = () => {
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollBy({ top: 160, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  const totalResults =
    (results.chats?.length || 0) +
    (results.files?.length || 0) +
    (results.prompts?.length || 0) +
    (results.commands?.length || 0) +
    (results.memories?.length || 0);

  const showChats = activeCategory === 'all' || activeCategory === 'chats';
  const showFiles = activeCategory === 'all' || activeCategory === 'files';
  const showPrompts = activeCategory === 'all' || activeCategory === 'prompts';
  const showCommands = activeCategory === 'all' || activeCategory === 'commands';
  const showMemories = activeCategory === 'all' || activeCategory === 'memories';

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="search-modal-header">
          <div className="search-header-title">
            <span className="phase-pill font-mono">Phase 16</span>
            <h2>Search Feature</h2>
            <span className="shortcut-badge font-mono">Ctrl + K</span>
          </div>
          <button type="button" className="search-close-btn" onClick={onClose} title="Close Search (Esc)">
            ✕
          </button>
        </div>

        {/* Main Search Input Bar */}
        <div className="search-input-box">
          <span className="search-box-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            placeholder="Search previous chats, uploaded files, saved prompts, commands, or memories..."
            value={query}
            onChange={handleQueryChange}
          />
          {query && (
            <button type="button" className="clear-query-btn" onClick={() => { setQuery(''); fetchSearchResults(''); }}>
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Pills Bar */}
        <div className="category-pills-bar">
          <button
            className={`pill-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            🔍 All ({totalResults})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveCategory('chats')}
          >
            💬 Previous Chats ({results.chats?.length || 0})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'files' ? 'active' : ''}`}
            onClick={() => setActiveCategory('files')}
          >
            📁 Uploaded Files ({results.files?.length || 0})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveCategory('prompts')}
          >
            📚 Saved Prompts ({results.prompts?.length || 0})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'commands' ? 'active' : ''}`}
            onClick={() => setActiveCategory('commands')}
          >
            ⚡ Commands ({results.commands?.length || 0})
          </button>
          <button
            className={`pill-btn ${activeCategory === 'memories' ? 'active' : ''}`}
            onClick={() => setActiveCategory('memories')}
          >
            🧠 AI Memories ({results.memories?.length || 0})
          </button>
        </div>

        {/* Main Card Container Layout (Matching Reference Image) */}
        <div className="search-card-wrapper">
          <button
            type="button"
            className="card-copy-btn"
            onClick={handleCopyResults}
            title="Copy search results summary"
          >
            {copied ? '✓ Copied' : '❐'}
          </button>
          <div className="search-results-scroll-area" ref={resultsContainerRef}>
            {loading && (
              <div className="search-loading-state">
                <span>⚡ Searching across all categories...</span>
              </div>
            )}

            {!loading && totalResults === 0 && (
              <div className="search-empty-state">
                <span className="empty-icon font-emoji">🔍</span>
                <p>No results found for &quot;{query}&quot;</p>
                <span className="empty-subtext">Try searching for keywords like &quot;code&quot;, &quot;image&quot;, &quot;resume&quot;, or slash commands</span>
              </div>
            )}

            {/* Category 1: Previous Chats */}
            {showChats && results.chats && results.chats.length > 0 && (
              <div className="result-category-block">
                <div className="category-header">
                  <span>Previous Chats</span>
                  <span className="category-count">{results.chats.length}</span>
                </div>
                <div className="results-items-list">
                  {results.chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="result-item-card"
                      onClick={() => {
                        onSelectConversation(chat.id);
                        onClose();
                      }}
                    >
                      <div className="item-left-icon">💬</div>
                      <div className="item-meta">
                        <h4 className="item-title">{chat.title}</h4>
                        <p className="item-snippet">{chat.matchingSnippet}</p>
                      </div>
                      <span className="action-hint">Jump to chat ➔</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category 2: Uploaded Files */}
            {showFiles && results.files && results.files.length > 0 && (
              <div className="result-category-block">
                <div className="category-header">
                  <span>Uploaded Files</span>
                  <span className="category-count">{results.files.length}</span>
                </div>
                <div className="results-items-list">
                  {results.files.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="result-item-card"
                      onClick={() => {
                        if (file.convId) onSelectConversation(file.convId);
                        onClose();
                      }}
                    >
                      <div className="item-left-icon">📁</div>
                      <div className="item-meta">
                        <h4 className="item-title">{file.name}</h4>
                        <p className="item-snippet">Attachment in chat: {file.convTitle || 'Conversation'}</p>
                      </div>
                      <span className="file-type-pill">{file.type ? file.type.toUpperCase() : 'FILE'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category 3: Saved Prompts */}
            {showPrompts && results.prompts && results.prompts.length > 0 && (
              <div className="result-category-block">
                <div className="category-header">
                  <span>Saved Prompts</span>
                  <span className="category-count">{results.prompts.length}</span>
                </div>
                <div className="results-items-list">
                  {results.prompts.map((p) => (
                    <div
                      key={p.id}
                      className="result-item-card"
                      onClick={() => {
                        if (onSelectPrompt) onSelectPrompt(p.prompt);
                        onClose();
                      }}
                    >
                      <div className="item-left-icon">{p.icon || '📚'}</div>
                      <div className="item-meta">
                        <h4 className="item-title">{p.title} <span className="item-cat-badge">{p.category}</span></h4>
                        <p className="item-snippet">{p.prompt}</p>
                      </div>
                      <span className="action-hint">Use prompt ↵</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category 4: Commands */}
            {showCommands && results.commands && results.commands.length > 0 && (
              <div className="result-category-block">
                <div className="category-header">
                  <span>Commands</span>
                  <span className="category-count">{results.commands.length}</span>
                </div>
                <div className="results-items-list">
                  {results.commands.map((cmd) => (
                    <div
                      key={cmd.command}
                      className="result-item-card"
                      onClick={() => {
                        if (onRunCommand) onRunCommand(cmd.command);
                        onClose();
                      }}
                    >
                      <div className="item-left-icon">{cmd.icon || '⚡'}</div>
                      <div className="item-meta">
                        <h4 className="item-title font-mono">{cmd.command} — {cmd.name}</h4>
                        <p className="item-snippet">{cmd.desc}</p>
                      </div>
                      <span className="action-hint">Execute ⚡</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category 5: AI Memories (Expanded) */}
            {showMemories && results.memories && results.memories.length > 0 && (
              <div className="result-category-block">
                <div className="category-header">
                  <span>AI Memories</span>
                  <span className="category-count">{results.memories.length}</span>
                </div>
                <div className="results-items-list">
                  {results.memories.map((mem) => (
                    <div
                      key={mem.id || mem._id}
                      className="result-item-card"
                      onClick={() => {
                        if (onOpenMemoryModal) onOpenMemoryModal();
                        onClose();
                      }}
                    >
                      <div className="item-left-icon">🧠</div>
                      <div className="item-meta">
                        <h4 className="item-title">{mem.key}</h4>
                        <p className="item-snippet">{mem.value}</p>
                      </div>
                      <span className="item-cat-badge">{mem.category || 'Memory'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expandable / Scroll Down Arrow Indicator (Matching Image) */}
          <button
            type="button"
            className="scroll-down-indicator-btn"
            onClick={handleScrollDown}
            title="Scroll down for more search results"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
