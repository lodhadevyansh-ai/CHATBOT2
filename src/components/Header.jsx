import { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from './MultiLanguageModal';
import './Header.css';
import {
  ClearIcon,
  TrashIcon,
  MenuIcon,
  SearchIcon,
  CodeIcon,
  PromptIcon,
  BrainIcon,
  AnalyticsIcon,
  GlobeIcon,
  VolumeIcon,
  MicIcon,
  SettingsIcon,
  UserPlusIcon,
  PlusIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  SparklesIcon,
  ZapIcon,
  LogOutIcon
} from './Icons';

const MODEL_OPTIONS = [
  { id: 'auto', label: 'Smart Auto AI', icon: ZapIcon, subtitle: 'Automatic model selection' },
  { id: 'gemini', label: 'Gemini 3.6 Flash', icon: SparklesIcon, subtitle: 'Fast & intelligent' },
  { id: 'openai', label: 'ChatGPT (GPT-4o)', icon: BrainIcon, subtitle: 'Advanced reasoning' },
  { id: 'copilot', label: 'Copilot / OpenRouter', icon: CodeIcon, subtitle: 'Code & developer models' },
];

const THEME_OPTIONS = [
  { id: 'system', label: 'System', icon: MonitorIcon },
  { id: 'light', label: 'Light', icon: SunIcon },
  { id: 'dark', label: 'Dark', icon: MoonIcon },
];

export function Header({
  user,
  savedAccounts = [],
  onSwitchAccount,
  onAddAccount,
  onLogoutAccount,
  onLogoutAllAccounts,
  selectedModel,
  onSelectModel,
  themeChoice,
  onSelectTheme,
  onOpenAuth,
  onLogout,
  onOpenDeleteAccount,
  isSidebarOpen,
  onToggleSidebar,
  activeTitle,
  onOpenVoiceSettings,
  autoSpeak,
  onlineCount = 1,
  socketConnected = false,
  onOpenRealTimeModal,
  onOpenMemoryModal,
  memoryCount = 0,
  onOpenPromptLibrary,
  onOpenCodeAssistant,
  onClearCurrentChat,
  selectedLanguage = 'en',
  onOpenMultiLanguageModal,
  onOpenAnalytics,
  onOpenSearch
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutFlyoutOpen, setIsLogoutFlyoutOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const accountMenuRef = useRef(null);
  const themeMenuRef = useRef(null);
  const modelMenuRef = useRef(null);

  const getInitials = (u) => {
    if (!u) return 'U';
    if (u.email) return u.email.substring(0, 2).toUpperCase();
    if (u.username) return u.username.substring(0, 2).toUpperCase();
    if (u.name) return u.name.substring(0, 2).toUpperCase();
    return 'U';
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false);
        setIsLogoutFlyoutOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setIsThemeMenuOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logoutAccountsList = (savedAccounts && savedAccounts.length > 0)
    ? savedAccounts
    : (user ? [{ user }] : []);

  const currentModelObj = MODEL_OPTIONS.find((m) => m.id === (selectedModel || 'auto')) || MODEL_OPTIONS[0];
  const CurrentModelIcon = currentModelObj.icon;

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          <MenuIcon size={16} />
        </button>

        <div className="custom-dropdown-wrapper" ref={modelMenuRef}>
          <button
            type="button"
            className="custom-dropdown-btn model-selector-btn"
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            title="Select AI Model Provider"
          >
            <CurrentModelIcon size={14} />
            <span className="dropdown-btn-label">{currentModelObj.label}</span>
            <ChevronDownIcon size={11} className={`dropdown-arrow ${isModelMenuOpen ? 'open' : ''}`} />
          </button>

          {isModelMenuOpen && (
            <div className="custom-dropdown-menu model-dropdown-menu">
              {MODEL_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = (selectedModel || 'auto') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`custom-dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      if (onSelectModel) onSelectModel(opt.id);
                      setIsModelMenuOpen(false);
                    }}
                  >
                    <IconComponent size={14} />
                    <div className="dropdown-item-meta">
                      <span className="dropdown-item-title">{opt.label}</span>
                      <span className="dropdown-item-sub">{opt.subtitle}</span>
                    </div>
                    {isSelected && <span className="dropdown-check">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeTitle && activeTitle !== 'New Chat' && (
          <div className="active-chat-title-badge" title={activeTitle}>
            <span className="chat-title-text">{activeTitle}</span>
          </div>
        )}

        <button
          type="button"
          className="btn-clear-current-chat"
          onClick={onClearCurrentChat}
          title="Clear active chat messages"
        >
          <ClearIcon size={14} />
          <span>Clear</span>
        </button>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="btn-global-search"
          onClick={onOpenSearch}
          title="Search conversations, files, prompts, commands (Ctrl+K)"
        >
          <SearchIcon size={14} className="search-btn-icon" />
          <span className="search-btn-text">Search</span>
          <span className="search-btn-pill font-mono">Ctrl+K</span>
        </button>

        <div className="header-actions-main-group">
          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenCodeAssistant}
            title="Code Assistant"
          >
            <CodeIcon size={14} />
            <span>Code AI</span>
          </button>

          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenPromptLibrary}
            title="Prompt Library"
          >
            <PromptIcon size={14} />
            <span>Prompts</span>
          </button>

          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenMemoryModal}
            title="AI Memory Manager"
          >
            <BrainIcon size={14} />
            <span>Memory ({memoryCount})</span>
          </button>

          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenAnalytics}
            title="Analytics Dashboard"
          >
            <AnalyticsIcon size={14} />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenMultiLanguageModal}
            title="Language Settings"
          >
            <GlobeIcon size={14} />
            <span>{(SUPPORTED_LANGUAGES || []).find(l => l.code === selectedLanguage)?.name || 'Language'}</span>
          </button>

          <button
            type="button"
            className={`btn-header-action ${autoSpeak ? 'active' : ''}`}
            onClick={onOpenVoiceSettings}
            title="Voice Assistant Controls"
          >
            {autoSpeak ? <VolumeIcon size={14} /> : <MicIcon size={14} />}
            <span>Voice</span>
          </button>

          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenRealTimeModal}
            title="Socket.io Real-Time Connection"
          >
            <span className={`realtime-dot ${socketConnected ? 'online' : 'offline'}`}></span>
            <span>{onlineCount} Online</span>
          </button>
        </div>

        {/* Responsive Overflow Dropdown Menu */}
        <div className="header-overflow-menu-wrapper" ref={moreMenuRef}>
          <button
            type="button"
            className="btn-header-overflow-toggle"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            title="More Options"
          >
            <span>More</span>
            <SettingsIcon size={14} />
          </button>

          {isMoreMenuOpen && (
            <div className="header-overflow-dropdown">
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenCodeAssistant(); setIsMoreMenuOpen(false); }}
              >
                <CodeIcon size={14} /> <span>Code AI</span>
              </button>
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenPromptLibrary(); setIsMoreMenuOpen(false); }}
              >
                <PromptIcon size={14} /> <span>Prompts</span>
              </button>
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenMemoryModal(); setIsMoreMenuOpen(false); }}
              >
                <BrainIcon size={14} /> <span>Memory ({memoryCount})</span>
              </button>
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenAnalytics(); setIsMoreMenuOpen(false); }}
              >
                <AnalyticsIcon size={14} /> <span>Analytics</span>
              </button>
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenMultiLanguageModal(); setIsMoreMenuOpen(false); }}
              >
                <GlobeIcon size={14} /> <span>Language</span>
              </button>
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenVoiceSettings(); setIsMoreMenuOpen(false); }}
              >
                {autoSpeak ? <VolumeIcon size={14} /> : <MicIcon size={14} />} <span>Voice Assistant</span>
              </button>
              <button
                type="button"
                className="overflow-dropdown-item"
                onClick={() => { onOpenRealTimeModal(); setIsMoreMenuOpen(false); }}
              >
                <span className={`realtime-dot ${socketConnected ? 'online' : 'offline'}`}></span>
                <span>{onlineCount} Online Users</span>
              </button>
            </div>
          )}
        </div>

        {/* Custom Theme Selector Dropdown */}
        <div className="custom-dropdown-wrapper" ref={themeMenuRef}>
          <button
            type="button"
            className="custom-dropdown-btn"
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            title="Theme Mode"
          >
            {themeChoice === 'light' ? (
              <SunIcon size={14} />
            ) : themeChoice === 'dark' ? (
              <MoonIcon size={14} />
            ) : (
              <MonitorIcon size={14} />
            )}
            <span className="dropdown-btn-label">
              {themeChoice === 'light' ? 'Light' : themeChoice === 'dark' ? 'Dark' : 'System'}
            </span>
            <ChevronDownIcon size={11} className={`dropdown-arrow ${isThemeMenuOpen ? 'open' : ''}`} />
          </button>

          {isThemeMenuOpen && (
            <div className="custom-dropdown-menu theme-dropdown-menu">
              {THEME_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = (themeChoice || 'system') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`custom-dropdown-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      if (onSelectTheme) onSelectTheme(opt.id);
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    <IconComponent size={14} />
                    <span>{opt.label}</span>
                    {isSelected && <span className="dropdown-check">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-Account Profile Switcher Dropdown */}
        <div className="user-profile-menu-wrapper" ref={accountMenuRef}>
          {user ? (
            <div className="user-header-profile-group">
              <button
                type="button"
                className="user-profile-badge-btn"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                title="Manage accounts & switch user"
              >
                <div className="avatar-circle">
                  {(user.username || user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="username">@{user.username || user.name || 'User'}</span>
                <ChevronDownIcon size={11} className="profile-dropdown-arrow" />
              </button>

              <button
                type="button"
                className="btn-direct-add-account"
                onClick={() => {
                  if (onAddAccount) onAddAccount();
                }}
                title="Add another user account"
              >
                <UserPlusIcon size={13} /> <span className="btn-text">Add Account</span>
              </button>

              {onOpenDeleteAccount && (
                <button
                  type="button"
                  className="btn-direct-delete-account"
                  onClick={onOpenDeleteAccount}
                  title="Delete current user account permanently"
                >
                  <TrashIcon size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="btn-header-login" onClick={() => onOpenAuth('login')}>
                Log In
              </button>
              <button className="btn-header-signup" onClick={() => onOpenAuth('signup')}>
                Sign Up
              </button>
            </div>
          )}

          {isAccountMenuOpen && user && (
            <div className="account-switcher-dropdown">
              <div className="account-switcher-header">
                <span className="switcher-section-title">ACTIVE ACCOUNT</span>
                <div className="active-account-row">
                  <div className="avatar-circle">
                    {(user.username || user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="account-meta">
                    <span className="account-username">@{user.username || user.name || 'User'}</span>
                    <span className="account-email">{user.email || 'Authenticated User'}</span>
                  </div>
                  <span className="active-check font-mono">✓</span>
                </div>
              </div>

              {savedAccounts && savedAccounts.length > 1 && (
                <div className="saved-accounts-section">
                  <span className="switcher-section-title">SWITCH ACCOUNT ({savedAccounts.length - 1})</span>
                  <div className="saved-accounts-list">
                    {savedAccounts.map((acc, idx) => {
                      if (!acc || !acc.user) return null;
                      const isActive = (acc.user.id && user?.id && acc.user.id === user.id) ||
                                       (acc.user.email && user?.email && acc.user.email === user.email);
                      if (isActive) return null;
                      const accUsername = acc.user.username || acc.user.name || 'User';
                      return (
                        <div
                          key={acc.user.id || acc.user.email || acc.token || `acc-${idx}`}
                          className="saved-account-item"
                          onClick={() => {
                            if (onSwitchAccount) onSwitchAccount(acc);
                            setIsAccountMenuOpen(false);
                          }}
                          title={`Switch to @${accUsername}`}
                        >
                          <div className="avatar-circle mini">
                            {accUsername.charAt(0).toUpperCase()}
                          </div>
                          <div className="account-meta">
                            <span className="account-username">@{accUsername}</span>
                            {acc.user.email && <span className="account-email">{acc.user.email}</span>}
                          </div>
                          <button
                            type="button"
                            className="btn-remove-account"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onLogoutAccount) onLogoutAccount(acc);
                            }}
                            title="Remove account from saved sessions"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="account-switcher-actions">
                <button
                  type="button"
                  className="btn-account-action add-account"
                  onClick={() => {
                    if (onAddAccount) onAddAccount();
                    setIsAccountMenuOpen(false);
                  }}
                >
                  <PlusIcon size={14} /> <span>Add Another Account</span>
                </button>

                <div 
                  className="logout-flyout-wrapper"
                  onMouseEnter={() => setIsLogoutFlyoutOpen(true)}
                  onMouseLeave={() => setIsLogoutFlyoutOpen(false)}
                >
                  <button
                    type="button"
                    className={`btn-account-action logout-flyout-trigger ${isLogoutFlyoutOpen ? 'active' : ''}`}
                    onClick={() => setIsLogoutFlyoutOpen(!isLogoutFlyoutOpen)}
                  >
                    <div className="logout-trigger-content">
                      <LogOutIcon size={14} />
                      <span>Log out</span>
                    </div>
                    <span className="flyout-arrow">›</span>
                  </button>

                  {isLogoutFlyoutOpen && (
                    <div className="logout-sub-flyout-card">
                      <div className="logout-flyout-list">
                        {logoutAccountsList.map((acc, idx) => {
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
                    className="btn-account-action delete-account"
                    onClick={() => {
                      if (onOpenDeleteAccount) onOpenDeleteAccount(user);
                      setIsAccountMenuOpen(false);
                    }}
                  >
                    <TrashIcon size={13} /> <span>Delete Account</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


