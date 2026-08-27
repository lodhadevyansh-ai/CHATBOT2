import { useState, useEffect } from 'react';
import './AuthModal.css';

export function AuthModal({ isOpen, onClose, initialTab = 'login', onAuthSuccess }) {
  const [tab, setTab] = useState(initialTab); // 'login' | 'signup' | 'forgot'
  
  // Login & Signup Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot / Reset Password states
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: Request Code, 2: Enter Code & New Password
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setError('');
    setSuccess('');
    setResetStep(1);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccess('');
    setResetStep(1);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginIdentifier || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier, password })
      });

      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          throw new Error('Invalid JSON response received from server.');
        }
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (${res.status}). Please check server status.`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      setSuccess('Logged in successfully!');
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          throw new Error('Invalid JSON response received from server.');
        }
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (${res.status}). Please check server status.`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed.');
      }

      setSuccess('Account created! Logging you in...');
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
        onClose();
      }, 600);
    } catch (err) {
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  // Request Reset Code
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotIdentifier || !forgotIdentifier.trim()) {
      setError('Please enter your registered email address or username.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: forgotIdentifier })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to find account.');
      }

      setSuccess(`Verification code generated for ${data.username}! Use code: ${data.resetToken}`);
      setResetCode(data.resetToken || '');
      setResetStep(2);
    } catch (err) {
      setError(err.message || 'Could not process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetCode || !newPassword || !confirmNewPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: forgotIdentifier,
          resetToken: resetCode,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess('Password updated successfully! Switching to login...');
      setTimeout(() => {
        setLoginIdentifier(forgotIdentifier);
        setPassword('');
        handleTabSwitch('login');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('signup')}
          >
            Create Account
          </button>
          <button
            className={`auth-tab ${tab === 'forgot' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('forgot')}
          >
            Reset Password
          </button>
        </div>

        {error && <div className="auth-alert error">⚠️ {error}</div>}
        {success && <div className="auth-alert success">✅ {success}</div>}

        {tab === 'login' && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your chatbot account</p>

            <div className="form-group">
              <label htmlFor="loginIdentifier">Email or Username</label>
              <input
                id="loginIdentifier"
                type="text"
                placeholder="Enter email or username"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-with-link">
                <label htmlFor="loginPassword">Password</label>
                <button
                  type="button"
                  className="link-forgot-password"
                  onClick={() => handleTabSwitch('forgot')}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="password-input-wrapper">
                <input
                  id="loginPassword"
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

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        )}

        {tab === 'signup' && (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Join us to start chatting with AI</p>

            <div className="form-group">
              <label htmlFor="signupUsername">Username</label>
              <input
                id="signupUsername"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signupEmail">Email Address</label>
              <input
                id="signupEmail"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signupPassword">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="signupPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up & Login'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div className="forgot-password-container">
            <h2 className="auth-title">Forgot Password</h2>
            <p className="auth-subtitle">
              {resetStep === 1
                ? 'Enter your registered email or username to get a reset code'
                : 'Enter your verification code and choose a new password'}
            </p>

            {resetStep === 1 ? (
              <form className="auth-form" onSubmit={handleRequestResetCode}>
                <div className="form-group">
                  <label htmlFor="forgotIdentifier">Email Address or Username</label>
                  <input
                    id="forgotIdentifier"
                    type="text"
                    placeholder="Enter email or username"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-auth-submit" disabled={loading}>
                  {loading ? 'Verifying Account...' : 'Get Verification Code 🔑'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
                <div className="form-group">
                  <label htmlFor="resetCodeInput">6-Digit Verification Code</label>
                  <input
                    id="resetCodeInput"
                    type="text"
                    className="font-mono"
                    placeholder="Enter 6-digit code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPasswordInput">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPasswordInput"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                <div className="form-group">
                  <label htmlFor="confirmNewPasswordInput">Confirm New Password</label>
                  <input
                    id="confirmNewPasswordInput"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="reset-form-buttons">
                  <button
                    type="button"
                    className="btn-back-step"
                    onClick={() => setResetStep(1)}
                  >
                    ← Back
                  </button>
                  <button type="submit" className="btn-auth-submit flex-1" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
