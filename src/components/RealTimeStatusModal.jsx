import { useState, useEffect } from 'react';
import './RealTimeStatusModal.css';
import { UsersIcon, SparklesIcon, ZapIcon } from './Icons';
import { socketManager } from '../socket';

export function RealTimeStatusModal({ isOpen, onClose, socketConnected, onlineUsers, onlineCount, pingLatency, onCheckPing, user = null }) {
  const [activeTab, setActiveTab] = useState('users');
  const [currentPing, setCurrentPing] = useState(pingLatency || 0);

  useEffect(() => {
    setCurrentPing(pingLatency);
  }, [pingLatency]);

  if (!isOpen) return null;

  const handleRefreshPing = () => {
    if (onCheckPing) {
      onCheckPing((latency) => setCurrentPing(latency));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="realtime-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="realtime-modal-header">
          <div className="realtime-header-title">
            <span className="realtime-header-icon"><ZapIcon size={16} /></span>
            <h3>Real-Time Socket.io Live Status</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="realtime-connection-banner">
          <div className="status-indicator-group">
            <span className={`status-pulse-dot ${socketConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-connection-text">
              {socketConnected ? 'Socket.io Server Connected' : 'Connecting to Real-Time Server...'}
            </span>
          </div>
          <div className="latency-badge-group">
            <span className="latency-label">Ping:</span>
            <span className="latency-value">{currentPing ? `${currentPing} ms` : '-- ms'}</span>
            <button className="btn-ping-refresh" onClick={handleRefreshPing} title="Test Ping Latency">⚡ Test</button>
          </div>
        </div>

        <div className="realtime-modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon size={14} /> Online Users ({onlineCount})
          </button>
          <button
            className={`tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <SparklesIcon size={14} /> Real-Time Features (Phase 9)
          </button>
        </div>

        <div className="realtime-modal-body">
          {activeTab === 'users' && (
            <div className="online-users-panel">
              <div className="panel-summary">
                <span>Active Connected Sockets: <strong>{onlineCount}</strong></span>
              </div>
              <div className="users-list-grid">
                {onlineUsers && onlineUsers.length > 0 ? (
                  onlineUsers.map((u) => {
                    const currentSocketId = socketManager?.socket?.id;
                    const isSelf = (currentSocketId && u.socketId === currentSocketId) ||
                                   (user?.id && u.userId && u.userId === user.id) ||
                                   (onlineUsers.length === 1);
                    let displayName = u.username;
                    if (isSelf && user) {
                      displayName = user.username || user.name || displayName;
                    }
                    return (
                      <div key={u.socketId} className="user-card-item">
                        <div className="user-avatar-badge">
                          {isSelf ? (user ? (user.username || user.name || 'U').charAt(0).toUpperCase() : '👤') : (u.isGuest ? '👤' : (displayName ? displayName.charAt(0).toUpperCase() : 'U'))}
                          <span className="online-status-dot"></span>
                        </div>
                        <div className="user-details">
                          <span className="user-name-title">
                            {displayName} {u.isGuest && !isSelf && <span className="guest-tag">(Guest)</span>}
                          </span>
                          <span className="user-socket-id">ID: {u.socketId.substring(0, 10)}...</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-users-state">
                    <p>No other active users online right now.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="features-info-panel">
              <div className="feature-status-card active">
                <div className="feature-icon font-emoji">✍️</div>
                <div className="feature-details">
                  <h4>Real-Time Typing Indicators</h4>
                  <p>Broadcasts live typing state when user types in textbox or when AI Bot generates answers.</p>
                  <span className="feature-badge active">● Live Active</span>
                </div>
              </div>

              <div className="feature-status-card active">
                <div className="feature-icon font-emoji">👥</div>
                <div className="feature-details">
                  <h4>Live Online Presence</h4>
                  <p>Tracks connected sockets in real time and broadcasts join/disconnect updates live.</p>
                  <span className="feature-badge active">● Live Active</span>
                </div>
              </div>

              <div className="feature-status-card active">
                <div className="feature-icon font-emoji">⚡</div>
                <div className="feature-details">
                  <h4>Instant Message Synchronization</h4>
                  <p>Instant socket message emission across multiple tabs/clients without page refresh.</p>
                  <span className="feature-badge active">● Live Active</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="realtime-modal-footer">
          <button className="btn-secondary-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
