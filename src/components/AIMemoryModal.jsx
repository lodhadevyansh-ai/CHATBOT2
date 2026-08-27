import { useState } from 'react';
import './AIMemoryModal.css';
import { ClearIcon, TrashIcon } from './Icons';

export function AIMemoryModal({
  isOpen,
  onClose,
  memories = [],
  mongoStatus = {},
  onAddMemory,
  onDeleteMemory,
  onClearAllMemories
}) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newCategory, setNewCategory] = useState('fact');

  if (!isOpen) return null;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newKey.trim() || !newVal.trim()) return;

    if (onAddMemory) {
      onAddMemory({ key: newKey.trim(), value: newVal.trim(), category: newCategory });
    }

    setNewKey('');
    setNewVal('');
  };

  const isConnected = mongoStatus?.connected;

  return (
    <div className="memory-modal-overlay" onClick={onClose}>
      <div className="memory-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="memory-modal-header">
          <div className="memory-title-group">
            <h2 className="memory-modal-title">🧠 AI Memory</h2>
            <div className={`mongo-status-badge ${isConnected ? 'connected' : 'offline'}`} title={mongoStatus.statusMessage || ''}>
              <span className="status-dot-indicator"></span>
              <span>{isConnected ? 'MongoDB Connected' : 'Local DB Sync Mode'}</span>
            </div>
          </div>
          <button type="button" className="memory-modal-close-btn" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        <div className="memory-modal-body">
          <div className="memory-intro-banner">
            💡 <strong>How AI Memory Works:</strong> When you type personal statements (e.g. <em>&quot;My name is Devyansh&quot;</em>, <em>&quot;I live in Seattle&quot;</em>, <em>&quot;My favorite language is Python&quot;</em>), the chatbot automatically extracts and saves these facts in <strong>MongoDB</strong> so it can answer questions like <em>&quot;What&apos;s my name?&quot;</em> anytime later!
          </div>

          <form className="memory-add-form" onSubmit={handleAddSubmit}>
            <input
              type="text"
              className="memory-input-key"
              placeholder="Key (e.g. name, location)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              required
            />
            <input
              type="text"
              className="memory-input-val"
              placeholder="Value (e.g. Devyansh, Chicago)"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              required
            />
            <select
              className="memory-select-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="identity">Identity</option>
              <option value="location">Location</option>
              <option value="preference">Preference</option>
              <option value="fact">Fact</option>
              <option value="custom">Custom</option>
            </select>
            <button type="submit" className="btn-add-memory">
              + Add Memory
            </button>
          </form>

          <div className="memory-list-section">
            <div className="memory-section-header">
              <span className="memory-count-title">
                Remembered Facts ({memories.length})
              </span>
            </div>

            {memories.length === 0 ? (
              <div className="empty-memory-state">
                🧠 No memories stored yet! Type something like <strong>&quot;My name is Devyansh&quot;</strong> in chat or add a fact manually above.
              </div>
            ) : (
              <div className="memory-items-grid">
                {memories.map((m) => (
                  <div key={m.id || m.key} className="memory-card">
                    <div className="memory-card-main">
                      <div className="memory-card-key-row">
                        <span className="memory-key-name">{m.key}</span>
                        <span className="memory-category-tag">{m.category || 'fact'}</span>
                      </div>
                      <div className="memory-val-text">{m.value}</div>
                      {m.source && <span className="memory-source-tag">Stored in: {m.source}</span>}
                    </div>
                    <button
                      type="button"
                      className="btn-delete-memory-item"
                      onClick={() => onDeleteMemory && onDeleteMemory(m.id || m.key)}
                      title="Delete Memory"
                    >
                      <TrashIcon size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="memory-modal-footer">
          {memories.length > 0 && (
            <button
              type="button"
              className="btn-clear-all-memory"
              onClick={onClearAllMemories}
            >
              <ClearIcon size={14} />
              <span>Clear All Memory</span>
            </button>
          )}
          <button type="button" className="btn-done-modal" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
