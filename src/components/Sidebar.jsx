import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import { EditIcon, ClearIcon, TrashIcon, SearchIcon, PlusIcon, MessageSquareIcon, SunIcon, MoonIcon, MonitorIcon, PaletteIcon, LogOutIcon } from './Icons';
import { socketManager } from '../socket';

export function Sidebar({
  conversations = [],
  activeConvId = null,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onClearAllConversations,
  searchQuery = '',
  onSearchChange,
  isOpen = true,
  themeChoice = 'system',
  onSelectTheme,
  onlineUsers = [],
  onlineCount = 0,
  onOpenRealTimeModal,
  user = null,
  savedAccounts = [],
  onSwitchAccount,
  onAddAccount,
  onLogoutAccount,
  onLogoutAllAccounts,
  onOpenDeleteAccount,
  onOpenAuth
}) {
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutFlyoutOpen, setIsLogoutFlyoutOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen]);

  const getInitials = (u) => {
    if (!u) return 'U';
    if (u.name) {
      const parts = u.name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      return u.name.charAt(0).toUpperCase();
    }
    if (u.username) return u.username.charAt(0).toUpperCase();
    if (u.email) return u.email.charAt(0).toUpperCase();
    return 'U';
  };

  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    if (!conv) return;
    setEditingConvId(conv.id || conv._id);
    setEditingTitle(conv.title || '');
  };

  const handleSaveRename = (e, convId) => {
    e.stopPropagation();
    if (editingTitle.trim() && onRenameConversation) {
      onRenameConversation(convId, editingTitle.trim());
    }
    setEditingConvId(null);
  };

  const handleKeyDownRename = (e, convId) => {
    if (e.key === 'Enter') {
      handleSaveRename(e, convId);
    } else if (e.key === 'Escape') {
      setEditingConvId(null);
    }
  };

  const handleDelete = (e, convId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      if (onDeleteConversation) onDeleteConversation(convId);
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to clear ALL chat conversations? This action cannot be undone.')) {
      if (onClearAllConversations) onClearAllConversations();
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <button
          className="btn-new-chat"
          onClick={() => onNewChat && onNewChat()}
          type="button"
        >
          <div className="new-chat-left">
            <PlusIcon size={14} className="new-chat-plus" />
            <span>New chat</span>
          </div>
        </button>

        <div className="search-container">
          <SearchIcon size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search chats..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange && onSearchChange('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-section-title">
        <span>Recents</span>
        <div className="sidebar-title-actions">
          <span className="conversation-count">{conversations ? conversations.length : 0}</span>
          {conversations && conversations.length > 0 && (
            <button
              type="button"
              className="btn-clear-all-chats"
              onClick={handleClearAll}
              title="Clear all chat conversations"
            >
              <ClearIcon size={12} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="conversations-list">
        {!conversations || conversations.length === 0 ? (
          <div className="empty-conversations-card">
            <MessageSquareIcon size={24} className="empty-conv-icon" />
            <span className="empty-conv-title">No conversations yet</span>
            <p className="empty-conv-subtitle">Start a new conversation to see your chats here.</p>
          </div>
        ) : (
          conversations.map((conv, idx) => {
            if (!conv) return null;
            const convId = conv.id || conv._id || idx;
            const isActive = convId === activeConvId;
            const isEditing = convId === editingConvId;

            return (
              <div
                key={convId}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation && onSelectConversation(convId)}
              >
                {isEditing ? (
                  <div className="rename-input-container" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="rename-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDownRename(e, convId)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={(e) => handleSaveRename(e, convId)}
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={(e) => { e.stopPropagation(); setEditingConvId(null); }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="conversation-main">
                      <MessageSquareIcon size={14} className="conv-icon" />
                      <div className="conv-meta">
                        <span className="conv-title">{conv.title || 'Untitled Chat'}</span>
                        <span className="conv-date">{formatDate(conv.updatedAt || conv.createdAt)}</span>
                      </div>
                    </div>

                    <div className="conv-actions">
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={(e) => handleStartRename(e, conv)}
                        title="Rename conversation"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action delete"
                        onClick={(e) => handleDelete(e, convId)}
                        title="Delete chat"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ONLINE USERS Section */}
      <div className="sidebar-realtime-section">
        <div
          className="realtime-sidebar-header"
          onClick={() => onOpenRealTimeModal && onOpenRealTimeModal()}
          title="Click to view Socket.io connection details"
        >
          <div className="realtime-sidebar-title">
            <span className="live-dot-pulse"></span>
            <span className="realtime-section-heading">ONLINE USERS</span>
          </div>
          <span className="online-badge-count">{onlineCount || (onlineUsers ? onlineUsers.length : 1)}</span>
        </div>
        <div className="sidebar-online-users-list">
          {onlineUsers && onlineUsers.length > 0 ? (
            onlineUsers.map((u, idx) => {
              if (!u) return null;
              const currentSocketId = socketManager?.socket?.id;
              const isSelf = (currentSocketId && u.socketId === currentSocketId) ||
                             (user?.id && u.userId && u.userId === user.id) ||
                             (onlineUsers.length === 1);
              let uName = u.username || u.name || 'User';
              if (isSelf && user) {
                uName = user.username || user.name || uName;
              }
              const uInitial = uName.charAt(0).toUpperCase();
              const keyVal = u.socketId || u.id || u.userId || `user-${idx}`;
              return (
                <div key={keyVal} className="sidebar-user-row" title={`${uName} (${u.isGuest && !isSelf ? 'Guest' : 'Member'})`}>
                  <div className="user-avatar-mini">{uInitial}</div>
                  <div className="sidebar-user-info">
                    <span className="sidebar-user-name">{uName}</span>
                    <span className="sidebar-user-status-text">Active now</span>
                  </div>
                  <span className="user-green-indicator" title="Online">🟢</span>
                </div>
              );
            })
          ) : (
            <div className="sidebar-user-row">
              <div className="user-avatar-mini">{user ? (user.username || user.name || 'Y').charAt(0).toUpperCase() : 'Y'}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user ? (user.username || user.name) : 'You'}</span>
                <span className="sidebar-user-status-text">Active now</span>
              </div>
              <span className="user-green-indicator" title="Online">🟢</span>
            </div>
          )}
        </div>
      </div>

      {/* Account Popover Menu & Profile Pill at bottom of Sidebar */}
      <div className="sidebar-account-container" ref={accountMenuRef}>
        {/* Floating Popover Account Menu */}
        {isAccountMenuOpen && user && (
          <div className="sidebar-account-popover">
            <div className="account-popover-list">
              {savedAccounts && savedAccounts.length > 0 ? (
                savedAccounts.map((acc, idx) => {
                  if (!acc || !acc.user) return null;
                  const isActive = (acc.user.id && user?.id && acc.user.id === user.id) ||
                                   (acc.user.email && user?.email && acc.user.email === user.email);
                  const accInitials = getInitials(acc.user);
                  const accName = acc.user.name || acc.user.username || 'User';
                  const accEmail = acc.user.email || '';

                  return (
                    <div
                      key={acc.user.id || acc.token || `pop-acc-${idx}`}
                      className={`account-popover-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (!isActive && onSwitchAccount) {
                          onSwitchAccount(acc);
                        }
                        setIsAccountMenuOpen(false);
                      }}
                    >
                      <div className="account-popover-avatar">{accInitials}</div>
                      <div className="account-popover-meta">
                        <span className="account-popover-name">{accName}</span>
                        {accEmail && <span className="account-popover-email">{accEmail}</span>}
                      </div>
                      {isActive ? (
                        <span className="account-popover-check">✓</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-sidebar-delete-acc"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenDeleteAccount) onOpenDeleteAccount(acc);
                            setIsAccountMenuOpen(false);
                          }}
                          title="Delete this account"
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="account-popover-item active">
                  <div className="account-popover-avatar">{getInitials(user)}</div>
                  <div className="account-popover-meta">
                    <span className="account-popover-name">{user.name || user.username || 'User'}</span>
                    {user.email && <span className="account-popover-email">{user.email}</span>}
                  </div>
                  <span className="account-popover-check">✓</span>
                </div>
              )}
            </div>

            <div className="account-popover-divider" />

            <button
              type="button"
              className="account-popover-add-btn"
              onClick={() => {
                setIsAccountMenuOpen(false);
                if (onAddAccount) onAddAccount();
                else if (onOpenAuth) onOpenAuth('login');
              }}
            >
              <span className="add-plus-icon">+</span>
              <span>Add another account</span>
            </button>

            {/* Logout Flyout Wrapper */}
            <div
              className="logout-flyout-wrapper sidebar-logout-wrapper"
              onMouseEnter={() => setIsLogoutFlyoutOpen(true)}
              onMouseLeave={() => setIsLogoutFlyoutOpen(false)}
            >
              <button
                type="button"
                className={`account-popover-action-btn logout ${isLogoutFlyoutOpen ? 'active' : ''}`}
                onClick={() => setIsLogoutFlyoutOpen(!isLogoutFlyoutOpen)}
              >
                <div className="action-btn-left">
                  <LogOutIcon size={14} />
                  <span>Log out</span>
                </div>
                <span className="flyout-arrow">›</span>
              </button>

              {isLogoutFlyoutOpen && (
                <div className="logout-sub-flyout-card sidebar-flyout">
                  <div className="logout-flyout-list">
                    {(savedAccounts && savedAccounts.length > 0 ? savedAccounts : [{ user }]).map((acc, idx) => {
                      const accUser = acc.user || acc;
                      const email = accUser.email || accUser.username || `Account ${idx + 1}`;
                      const initials = getInitials(accUser);
                      return (
                        <button
                          key={accUser.id || accUser.email || idx}
                          type="button"
                          className="logout-flyout-item"
                          onClick={() => {
                            if (onLogoutAccount) onLogoutAccount(acc);
                            setIsAccountMenuOpen(false);
                            setIsLogoutFlyoutOpen(false);
                          }}
                        >
                          <span className="logout-avatar-badge">{initials}</span>
                          <span className="logout-item-text">Log out of {email}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="logout-flyout-divider" />

                  <button
                    type="button"
                    className="logout-flyout-item logout-all-item"
                    onClick={() => {
                      if (onLogoutAllAccounts) onLogoutAllAccounts();
                      else if (onLogoutAccount) onLogoutAccount({ user });
                      setIsAccountMenuOpen(false);
                      setIsLogoutFlyoutOpen(false);
                    }}
                  >
                    <LogOutIcon size={16} />
                    <span className="logout-item-text">Log out of all accounts</span>
                  </button>
                </div>
              )}
            </div>

            {onOpenDeleteAccount && (
              <button
                type="button"
                className="account-popover-action-btn delete"
                onClick={() => {
                  if (onOpenDeleteAccount) onOpenDeleteAccount(user);
                  setIsAccountMenuOpen(false);
                }}
              >
                <TrashIcon size={13} />
                <span>Delete account</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom Profile Pill Card */}
        {user ? (
          <button
            type="button"
            className="sidebar-user-pill"
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          >
            <div className="user-pill-avatar">{getInitials(user)}</div>
            <div className="user-pill-info">
              <span className="user-pill-name">{user.name || user.username || 'User'}</span>
              <span className="user-pill-plan">Free</span>
            </div>
            <span className={`user-pill-chevron ${isAccountMenuOpen ? 'open' : ''}`}>›</span>
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-user-pill login-btn"
            onClick={() => {
              if (onOpenAuth) onOpenAuth('login');
              else if (onAddAccount) onAddAccount();
            }}
          >
            <div className="user-pill-avatar">🔑</div>
            <div className="user-pill-info">
              <span className="user-pill-name">Log In / Sign Up</span>
              <span className="user-pill-plan">Welcome to Chatbot</span>
            </div>
          </button>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-theme-control">
          <span className="sidebar-theme-label"><PaletteIcon size={14} /> Theme</span>
          <div className="sidebar-theme-pills">
            <button
              type="button"
              className={`theme-pill-btn ${themeChoice === 'light' ? 'active' : ''}`}
              onClick={() => onSelectTheme && onSelectTheme('light')}
              title="Light Theme"
            >
              <SunIcon size={13} /> Light
            </button>
            <button
              type="button"
              className={`theme-pill-btn ${themeChoice === 'dark' ? 'active' : ''}`}
              onClick={() => onSelectTheme && onSelectTheme('dark')}
              title="Dark Theme"
            >
              <MoonIcon size={13} /> Dark
            </button>
            <button
              type="button"
              className={`theme-pill-btn ${themeChoice === 'system' ? 'active' : ''}`}
              onClick={() => onSelectTheme && onSelectTheme('system')}
              title="System Theme"
            >
              <MonitorIcon size={13} /> System
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
