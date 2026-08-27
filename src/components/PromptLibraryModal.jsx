import { useState, useEffect } from 'react';
import { DEFAULT_PROMPT_EXAMPLES } from '../constants/prompts';
import './PromptLibraryModal.css';
import { EditIcon, TrashIcon, SparklesIcon, BookmarkIcon, PlusIcon, MonitorIcon } from './Icons';

export { DEFAULT_PROMPT_EXAMPLES };

export function PromptLibraryModal({ isOpen, onClose, onSelectPrompt }) {
  const [activeTab, setActiveTab] = useState('examples'); // 'examples' | 'custom' | 'create'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('chatbot_favorite_prompts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customPrompts, setCustomPrompts] = useState(() => {
    try {
      const saved = localStorage.getItem('chatbot_custom_prompts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [editingCustomId, setEditingCustomId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPromptText, setEditPromptText] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const CATEGORIES = ['All', 'Favorites', 'Coding', 'DSA', 'Study', 'Career', 'Writing', 'Research', 'Productivity', 'General'];

  useEffect(() => {
    try {
      localStorage.setItem('chatbot_custom_prompts', JSON.stringify(customPrompts));
    } catch (e) {
      console.warn('Failed to save custom prompts:', e);
    }
  }, [customPrompts]);

  useEffect(() => {
    try {
      localStorage.setItem('chatbot_favorite_prompts', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorite prompts:', e);
    }
  }, [favorites]);

  if (!isOpen) return null;

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleCopy = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunPrompt = (text) => {
    if (onSelectPrompt) {
      onSelectPrompt(text);
    }
    onClose();
  };

  const handleSaveCustomPrompt = (e) => {
    e.preventDefault();
    if (!newPromptText.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim() || 'Custom Prompt',
      prompt: newPromptText.trim(),
      category: 'User Created',
      createdAt: new Date().toLocaleDateString()
    };

    setCustomPrompts([newItem, ...customPrompts]);
    setNewTitle('');
    setNewPromptText('');
    setActiveTab('custom');
  };

  const handleStartEditCustom = (item, e) => {
    e.stopPropagation();
    setEditingCustomId(item.id);
    setEditTitle(item.title);
    setEditPromptText(item.prompt);
  };

  const handleSaveEditCustom = (id, e) => {
    e.stopPropagation();
    if (!editPromptText.trim()) return;
    setCustomPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, title: editTitle.trim() || 'Custom Prompt', prompt: editPromptText.trim() } : p
    ));
    setEditingCustomId(null);
  };

  const handleDeleteCustomPrompt = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved prompt?')) {
      setCustomPrompts(customPrompts.filter(p => p.id !== id));
      setFavorites(favorites.filter(fId => fId !== id));
    }
  };

  const filterPrompts = (items) => {
    return items.filter(item => {
      const matchesSearch = !searchQuery.trim() || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase());

      if (selectedCategory === 'Favorites') {
        return matchesSearch && favorites.includes(item.id);
      }
      if (selectedCategory === 'All') {
        return matchesSearch;
      }
      return matchesSearch && (item.category || '').toLowerCase() === selectedCategory.toLowerCase();
    });
  };

  const filteredExamples = filterPrompts(DEFAULT_PROMPT_EXAMPLES);
  const filteredCustom = filterPrompts(customPrompts);

  return (
    <div className="prompt-modal-overlay" onClick={onClose}>
      <div className="prompt-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-modal-header">
          <div className="prompt-modal-title">
            <span className="prompt-title-icon">📚</span>
            <div>
              <h2>Prompt Library <span className="phase-pill font-mono">Phase 18</span></h2>
              <p className="prompt-subtitle">Curated AI prompts, saved commands, and instant workflows</p>
            </div>
          </div>
          <button type="button" className="prompt-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="prompt-search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="prompt-search-input"
            placeholder="Search prompts by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-prompt-search" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="prompt-modal-tabs">
          <button
            type="button"
            className={`prompt-tab-btn ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            <SparklesIcon size={14} /> Starter Templates ({filteredExamples.length})
          </button>
          <button
            type="button"
            className={`prompt-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            <BookmarkIcon size={14} /> Saved Prompts ({customPrompts.length})
          </button>
          <button
            type="button"
            className={`prompt-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <PlusIcon size={14} /> Create New Prompt
          </button>
          <button
            type="button"
            className={`prompt-tab-btn ${activeTab === 'responsive' ? 'active' : ''}`}
            onClick={() => setActiveTab('responsive')}
          >
            <MonitorIcon size={14} /> Phase 18: Responsive UI
          </button>
        </div>

        <div className="prompt-modal-body">
          {activeTab === 'examples' && (
            <div>
              <div className="prompt-category-filter-bar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`prompt-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'Favorites' ? `⭐ ${cat}` : cat}
                  </button>
                ))}
              </div>

              {filteredExamples.length === 0 ? (
                <div className="empty-prompt-state">
                  <span className="empty-icon">🔍</span>
                  <p>No matching starter prompts found for &quot;{searchQuery || selectedCategory}&quot;</p>
                </div>
              ) : (
                <div className="prompt-grid">
                  {filteredExamples.map((item) => {
                    const isFav = favorites.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="prompt-card"
                        onClick={() => handleRunPrompt(item.prompt)}
                        title="Click to use this prompt in chat"
                      >
                        <div className="prompt-card-header">
                          <div className="prompt-card-title-group">
                            <span className="prompt-card-icon">{item.icon || '📌'}</span>
                            <span className="prompt-card-title">{item.title}</span>
                          </div>
                          <div className="card-actions-right">
                            <button
                              type="button"
                              className={`btn-fav-prompt ${isFav ? 'fav-active' : ''}`}
                              onClick={(e) => toggleFavorite(item.id, e)}
                              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              {isFav ? '★' : '☆'}
                            </button>
                            <button
                              type="button"
                              className="btn-copy-prompt"
                              onClick={(e) => handleCopy(item.prompt, item.id, e)}
                              title="Copy prompt text"
                            >
                              {copiedId === item.id ? '✓ Copied' : '📋'}
                            </button>
                          </div>
                        </div>
                        <p className="prompt-card-desc">{item.prompt}</p>
                        <div className="prompt-card-footer">
                          <span className="prompt-category-badge">{item.category}</span>
                          <span className="prompt-run-action">Use Prompt ➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div>
              {customPrompts.length === 0 ? (
                <div className="empty-custom-prompts">
                  <span className="empty-icon">📁</span>
                  <h3>No Saved Custom Prompts</h3>
                  <p>Create your custom prompts for quick 1-click execution anytime!</p>
                  <button
                    type="button"
                    className="btn-go-create-prompt"
                    onClick={() => setActiveTab('create')}
                  >
                    + Create Your First Prompt
                  </button>
                </div>
              ) : (
                <div className="prompt-grid">
                  {filteredCustom.map((item) => {
                    const isFav = favorites.includes(item.id);
                    const isEditing = editingCustomId === item.id;

                    if (isEditing) {
                      return (
                        <div key={item.id} className="prompt-card custom-card editing-card" onClick={(e) => e.stopPropagation()}>
                          <div className="edit-prompt-form-mini">
                            <input
                              type="text"
                              className="prompt-modal-input mini"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Prompt title"
                            />
                            <textarea
                              className="prompt-modal-textarea mini"
                              rows={3}
                              value={editPromptText}
                              onChange={(e) => setEditPromptText(e.target.value)}
                              placeholder="Prompt text"
                            />
                            <div className="edit-actions-row">
                              <button
                                type="button"
                                className="btn-save-mini"
                                onClick={(e) => handleSaveEditCustom(item.id, e)}
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                className="btn-cancel-mini"
                                onClick={(e) => { e.stopPropagation(); setEditingCustomId(null); }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="prompt-card custom-card"
                        onClick={() => handleRunPrompt(item.prompt)}
                        title="Click to use this prompt in chat"
                      >
                        <div className="prompt-card-header">
                          <div className="prompt-card-title-group">
                            <span className="prompt-card-icon">📌</span>
                            <span className="prompt-card-title">{item.title}</span>
                          </div>
                          <div className="card-actions-right">
                            <button
                              type="button"
                              className={`btn-fav-prompt ${isFav ? 'fav-active' : ''}`}
                              onClick={(e) => toggleFavorite(item.id, e)}
                              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              {isFav ? '★' : '☆'}
                            </button>
                            <button
                              type="button"
                              className="btn-edit-prompt"
                              onClick={(e) => handleStartEditCustom(item, e)}
                              title="Edit Prompt"
                            >
                              <EditIcon size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-copy-prompt"
                              onClick={(e) => handleCopy(item.prompt, item.id, e)}
                              title="Copy prompt text"
                            >
                              {copiedId === item.id ? '✓ Copied' : '📋'}
                            </button>
                            <button
                              type="button"
                              className="btn-delete-prompt"
                              onClick={(e) => handleDeleteCustomPrompt(item.id, e)}
                              title="Delete prompt"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="prompt-card-desc">{item.prompt}</p>
                        <div className="prompt-card-footer">
                          <span className="prompt-date-badge">{item.createdAt || 'Saved'}</span>
                          <span className="prompt-run-action">Use Prompt ➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form className="create-prompt-form" onSubmit={handleSaveCustomPrompt}>
              <div className="form-group">
                <label htmlFor="prompt-title-input">Prompt Title / Label</label>
                <input
                  id="prompt-title-input"
                  type="text"
                  placeholder="e.g. React Refactor, Code Review, Blog Outline"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="prompt-modal-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prompt-text-input">Prompt Content / Instructions</label>
                <textarea
                  id="prompt-text-input"
                  rows={5}
                  placeholder="Write or paste your prompt instructions here..."
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  className="prompt-modal-textarea"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save-prompt-submit">
                  💾 Save to Prompt Library
                </button>
              </div>
            </form>
          )}

          {activeTab === 'responsive' && (
            <div className="phase18-wrapper">
              <div className="phase18-card">
                <div className="phase18-badge font-mono">Phase 18</div>
                <h3 className="phase18-title">Responsive UI</h3>
                <p className="phase18-subtitle">Works perfectly on</p>
                <ul className="phase18-list">
                  <li>Desktop</li>
                  <li>Tablet</li>
                  <li>Mobile</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
