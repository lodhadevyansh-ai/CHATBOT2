import { useState, useEffect } from 'react';
import './DeleteAccountModal.css';
import { TrashIcon } from './Icons';

export function DeleteAccountModal({
  isOpen,
  onClose,
  user,
  token,
  savedAccounts = [],
  targetAccount = null,
  onAccountDeleted
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Normalize list of available accounts
  const accountList = (savedAccounts && savedAccounts.length > 0)
    ? savedAccounts
    : (user ? [{ user, token }] : []);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setSuccess('');
      setLoading(false);

      if (targetAccount && accountList.length > 0) {
        const targetId = targetAccount.user?.id || targetAccount.id;
        const targetEmail = targetAccount.user?.email || targetAccount.email;
        const foundIdx = accountList.findIndex(acc => 
          (targetId && acc.user?.id === targetId) || (targetEmail && acc.user?.email === targetEmail)
        );
        setSelectedIndex(foundIdx !== -1 ? foundIdx : 0);
      } else {
        setSelectedIndex(0);
      }
    }
  }, [isOpen, targetAccount, savedAccounts]);

  if (!isOpen || accountList.length === 0) return null;

  const currentAccount = accountList[selectedIndex] || accountList[0];
  const targetUser = currentAccount?.user || user;
  const targetToken = currentAccount?.token || token;
  const isActiveUser = user?.id && targetUser?.id && user.id === targetUser.id;

  const getInitials = (u) => {
    if (!u) return 'U';
    if (u.email) return u.email.substring(0, 2).toUpperCase();
    if (u.username) return u.username.substring(0, 2).toUpperCase();
    if (u.name) return u.name.substring(0, 2).toUpperCase();
    return 'U';
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Please enter password to confirm account deletion.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${targetToken}`
        },
        body: JSON.stringify({ password })
      });

      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account.');
      }

      setSuccess(data.message || 'Account successfully deleted.');
      setTimeout(() => {
        if (onAccountDeleted) onAccountDeleted(currentAccount);
        onClose();
      }, 800);

    } catch (err) {
      setError(err.message || 'An error occurred during account deletion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delete-modal-overlay" onClick={onClose}>
      <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="delete-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="delete-header">
          <div className="delete-icon-badge">
            <TrashIcon size={24} />
          </div>
          <h2 className="delete-title">Delete Account</h2>
          <p className="delete-subtitle">
            Choose an account to permanently delete.
          </p>
        </div>

        {/* Account Selector if multiple accounts exist */}
        {accountList.length > 1 && (
          <div className="account-selector-container">
            <label className="account-selector-label" htmlFor="accountSelect">
              Select Account to Delete:
            </label>
            <select
              id="accountSelect"
              className="account-selector-dropdown"
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
            >
              {accountList.map((acc, idx) => {
                const accUser = acc.user || {};
                const isCurrent = user?.id && accUser.id && user.id === accUser.id;
                return (
                  <option key={accUser.id || accUser.email || idx} value={idx}>
                    {accUser.email || accUser.username || `Account ${idx + 1}`} {isCurrent ? '(Active)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Selected Target Account Preview Card */}
        <div className="target-account-card">
          <div className="target-account-avatar">
            {getInitials(targetUser)}
          </div>
          <div className="target-account-info">
            <span className="target-account-email">{targetUser.email || 'No email'}</span>
            <span className="target-account-username">
              @{targetUser.username || targetUser.name || 'User'} {isActiveUser && <span className="active-pill">Active Session</span>}
            </span>
          </div>
        </div>

        <div className="delete-warning-box">
          ⚠️ <strong>Warning:</strong> Deleting <strong>{targetUser.email || targetUser.username}</strong> is permanent. All associated chat history and settings will be wiped.
        </div>

        {error && <div className="delete-alert error">⚠️ {error}</div>}
        {success && <div className="delete-alert success">✅ {success}</div>}

        <form className="delete-form" onSubmit={handleDeleteSubmit}>
          <div className="form-group">
            <label htmlFor="confirmDeletePassword">
              Enter password for {targetUser.email || targetUser.username} to confirm
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirmDeletePassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="delete-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-delete-confirm" disabled={loading || !password}>
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

