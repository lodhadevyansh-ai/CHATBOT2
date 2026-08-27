import { useState, useEffect, useCallback } from 'react';
import './AnalyticsDashboardModal.css';
import { TrashIcon } from './Icons';

export function AnalyticsDashboardModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'admin'
  const [timeRange, setTimeRange] = useState('all'); // 'today' | '7days' | '30days' | 'all'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [resetMessage, setResetMessage] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/analytics/overview?timeRange=${timeRange}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to parse analytics payload');
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(err.message || 'Could not connect to analytics server.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, fetchAnalytics]);

  // Auto-refresh interval (every 8 seconds when modal is open and autoRefresh is enabled)
  useEffect(() => {
    let timer = null;
    if (isOpen && autoRefresh) {
      timer = setInterval(() => {
        fetchAnalytics();
      }, 8000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, autoRefresh, fetchAnalytics]);

  const handleExport = () => {
    window.open('/api/analytics/export', '_blank');
  };

  const handleResetAnalytics = async () => {
    if (!window.confirm('Are you sure you want to reset all analytics counters? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch('/api/analytics/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setResetMessage('Analytics metrics reset successfully!');
        setTimeout(() => setResetMessage(null), 4000);
        fetchAnalytics();
      }
    } catch (err) {
      alert('Failed to reset analytics: ' + err.message);
    }
  };

  if (!isOpen) return null;

  const kpi = data?.kpi || {};
  const commandUsage = data?.commandUsage || {};
  const modelUsage = data?.modelUsage || {};
  const featureUsage = data?.featureUsage || {};
  const latencyStats = data?.latencyStats || {};
  const timeline = data?.timeline || [];
  const userList = data?.userList || [];

  // Calculate total model API calls
  const totalModelCalls = Object.values(modelUsage).reduce((a, b) => a + b, 0) || 1;

  // Max value helper for timeline bar charts
  const maxTimelineMessages = Math.max(...timeline.map(t => t.messages), 1);

  // Popular commands sorted by count
  const sortedCommands = Object.entries(commandUsage)
    .sort(([, a], [, b]) => b - a);
  const maxCommandCount = Math.max(...sortedCommands.map(([, count]) => count), 1);

  // Model details helper
  const modelDetails = [
    { key: 'auto', name: 'Smart Auto AI', color: '#6366f1', icon: '⚡' },
    { key: 'gemini', name: 'Gemini 3.6 Flash', color: '#ec4899', icon: '✨' },
    { key: 'openai', name: 'ChatGPT (GPT-4o)', color: '#10b981', icon: '🤖' },
    { key: 'copilot', name: 'Copilot / OpenRouter', color: '#f59e0b', icon: '🚀' }
  ];

  // Helper format uptime
  const formatUptime = (secs = 0) => {
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="analytics-modal-backdrop" onClick={onClose}>
      <div className="analytics-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Section */}
        <div className="analytics-modal-header">
          <div className="header-title-block">
            <span className="phase-pill font-mono">Phase 15</span>
            <h2>📊 Analytics Dashboard & Admin Panel</h2>
            <p className="subtext">Real-time metrics, command insights, model API performance & user management</p>
          </div>
          <div className="header-top-actions">
            <button
              className={`refresh-btn ${loading ? 'spinning' : ''}`}
              onClick={fetchAnalytics}
              title="Refresh Analytics Data"
            >
              🔄 <span className="btn-label">Refresh</span>
            </button>
            <button className="analytics-close-btn" onClick={onClose} title="Close Modal">
              ✕
            </button>
          </div>
        </div>

        {/* Navigation & Controls Bar */}
        <div className="analytics-controls-bar">
          <div className="tab-group">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📈 Metrics Overview & Charts
            </button>
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              🛡️ Admin Users Directory ({userList.length})
            </button>
          </div>

          <div className="controls-right">
            <div className="time-range-picker">
              <label htmlFor="timeRangeSelect">Time Range:</label>
              <select
                id="timeRangeSelect"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <label className="auto-refresh-label" title="Automatically poll server every 8s">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Live Polling
            </label>

            <button className="export-btn" onClick={handleExport} title="Download JSON Analytics Summary">
              📥 Export JSON
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className="analytics-alert-toast">
            ✅ {resetMessage}
          </div>
        )}

        {error && (
          <div className="analytics-error-banner">
            ⚠️ {error} - Showing cached/offline stats.
          </div>
        )}

        {/* Modal Content */}
        <div className="analytics-modal-content">
          {activeTab === 'overview' && (
            <div className="overview-tab-content">
              {/* Top KPI Metric Cards Grid */}
              <div className="kpi-grid">
                <div className="kpi-card purple">
                  <div className="kpi-icon">👥</div>
                  <div className="kpi-info">
                    <span className="kpi-label">Number of Users</span>
                    <h3 className="kpi-value">{kpi.totalUsers || 0}</h3>
                    <span className="kpi-subtag">
                      {kpi.registeredUsers || 0} Registered • {kpi.guestUsers || 0} Guests
                    </span>
                  </div>
                </div>

                <div className="kpi-card green">
                  <div className="kpi-icon">📅</div>
                  <div className="kpi-info">
                    <span className="kpi-label">Today&apos;s Active Users</span>
                    <h3 className="kpi-value">{kpi.todaysActiveUsers || 0}</h3>
                    <span className="kpi-subtag">
                      +{kpi.todaysSignups || 0} new today • {kpi.onlineUsersNow || 0} Live Socket
                    </span>
                  </div>
                </div>

                <div className="kpi-card blue">
                  <div className="kpi-icon">💬</div>
                  <div className="kpi-info">
                    <span className="kpi-label">Messages Sent</span>
                    <h3 className="kpi-value">{kpi.totalMessagesSent || 0}</h3>
                    <span className="kpi-subtag">
                      +{kpi.todaysMessagesSent || 0} messages today
                    </span>
                  </div>
                </div>

                <div className="kpi-card orange">
                  <div className="kpi-icon">⚡</div>
                  <div className="kpi-info">
                    <span className="kpi-label">Avg Response Speed</span>
                    <h3 className="kpi-value">
                      {latencyStats.auto?.avgMs || latencyStats.gemini?.avgMs || 420} ms
                    </h3>
                    <span className="kpi-subtag">
                      Uptime: {formatUptime(kpi.serverUptimeSeconds)}
                    </span>
                  </div>
                </div>

                <div className="kpi-card pink">
                  <div className="kpi-icon">🤖</div>
                  <div className="kpi-info">
                    <span className="kpi-label">API Calls Tracked</span>
                    <h3 className="kpi-value">{totalModelCalls}</h3>
                    <span className="kpi-subtag">
                      Gemini, GPT-4o, Copilot, Auto
                    </span>
                  </div>
                </div>

                <div className="kpi-card teal">
                  <div className="kpi-icon">🌐</div>
                  <div className="kpi-info">
                    <span className="kpi-label">Multi-Lang Active</span>
                    <h3 className="kpi-value">16+</h3>
                    <span className="kpi-subtag">
                      Translations: {featureUsage.translation || 0} calls
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Charts & Analytics Layout */}
              <div className="charts-main-grid">
                {/* Chart 1: Daily Activity & Volume Trend */}
                <div className="analytics-card chart-card">
                  <div className="card-header">
                    <h4>📈 Daily Message Volume & User Activity (Last 7 Days)</h4>
                    <span className="card-badge">Trend Analytics</span>
                  </div>
                  <div className="bar-chart-container">
                    {timeline.map((day, idx) => {
                      const heightPercent = Math.round((day.messages / maxTimelineMessages) * 100);
                      return (
                        <div key={idx} className="bar-col">
                          <div className="bar-tooltip">
                            <strong>{day.dayLabel}</strong><br />
                            💬 {day.messages} Messages<br />
                            👥 {day.activeUsers} Active Users
                          </div>
                          <div className="bar-wrapper">
                            <div
                              className="bar-fill"
                              style={{ height: `${Math.max(heightPercent, 8)}%` }}
                            >
                              <span className="bar-val">{day.messages}</span>
                            </div>
                          </div>
                          <span className="bar-label">{day.dayLabel.split(',')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 2: Popular Commands Ranking */}
                <div className="analytics-card commands-card">
                  <div className="card-header">
                    <h4>Popular Commands</h4>
                    <span className="card-badge">Slash Commands & Tools</span>
                  </div>
                  <div className="command-bars-list">
                    {sortedCommands.map(([cmd, count]) => {
                      const pct = Math.round((count / maxCommandCount) * 100);
                      return (
                        <div key={cmd} className="command-row">
                          <div className="cmd-name font-mono">{cmd}</div>
                          <div className="cmd-bar-outer">
                            <div
                              className="cmd-bar-inner"
                              style={{ width: `${Math.max(pct, 5)}%` }}
                            ></div>
                          </div>
                          <div className="cmd-count">{count} calls</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 3: API Usage Breakdown per AI Model */}
                <div className="analytics-card model-card">
                  <div className="card-header">
                    <h4>API Usage</h4>
                    <span className="card-badge">AI Model Distribution</span>
                  </div>
                  <div className="model-progress-list">
                    {modelDetails.map(m => {
                      const count = modelUsage[m.key] || 0;
                      const percentage = Math.round((count / totalModelCalls) * 100) || 0;
                      const lat = latencyStats[m.key]?.avgMs || 0;
                      return (
                        <div key={m.key} className="model-item">
                          <div className="model-top">
                            <span className="model-name">
                              <span className="model-icon">{m.icon}</span> {m.name}
                            </span>
                            <span className="model-stats">
                              {count} calls ({percentage}%) • {lat > 0 ? `${lat}ms` : 'Fast'}
                            </span>
                          </div>
                          <div className="model-progress-bar">
                            <div
                              className="model-progress-fill"
                              style={{
                                width: `${Math.max(percentage, 4)}%`,
                                backgroundColor: m.color
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 4: Expanded Feature Highlights & System Speed */}
                <div className="analytics-card features-card">
                  <div className="card-header">
                    <h4>🛠️ Feature & Tools Breakdown</h4>
                    <span className="card-badge">Expanded Insights</span>
                  </div>
                  <div className="feature-metrics-grid">
                    <div className="feature-metric">
                      <span className="f-icon">🎨</span>
                      <div className="f-meta">
                        <span className="f-title">AI Image Gen</span>
                        <strong className="f-count">{featureUsage.image_generation || 0}</strong>
                      </div>
                    </div>

                    <div className="feature-metric">
                      <span className="f-icon">💻</span>
                      <div className="f-meta">
                        <span className="f-title">Code AI (Phase 12)</span>
                        <strong className="f-count">{featureUsage.code_assistant || 0}</strong>
                      </div>
                    </div>

                    <div className="feature-metric">
                      <span className="f-icon">🌐</span>
                      <div className="f-meta">
                        <span className="f-title">Multi-Language</span>
                        <strong className="f-count">{featureUsage.multi_language || 0}</strong>
                      </div>
                    </div>

                    <div className="feature-metric">
                      <span className="f-icon">🧠</span>
                      <div className="f-meta">
                        <span className="f-title">MongoDB Memories</span>
                        <strong className="f-count">{featureUsage.memory_operation || 0}</strong>
                      </div>
                    </div>

                    <div className="feature-metric">
                      <span className="f-icon">📱</span>
                      <div className="f-meta">
                        <span className="f-title">Responsive UI (Phase 18)</span>
                        <strong className="f-count font-mono" style={{ fontSize: '0.78rem', color: '#10b981' }}>Desktop • Tablet • Mobile</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="admin-tab-content">
              <div className="admin-header-actions">
                <div className="admin-title">
                  <h3>🛡️ Admin User Directory & System Control</h3>
                  <p>View registered accounts, registration dates, and perform administrative actions</p>
                </div>
                <button className="reset-analytics-btn" onClick={handleResetAnalytics}>
                  <TrashIcon size={14} />
                  <span>Reset Analytics Cache</span>
                </button>
              </div>

              {/* Registered Users Table */}
              <div className="user-table-container">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Account ID</th>
                      <th>Joined Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table">
                          No registered users found yet. (Guests are using the application)
                        </td>
                      </tr>
                    ) : (
                      userList.map(u => (
                        <tr key={u.id}>
                          <td className="user-cell">
                            <div className="table-avatar">
                              {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="table-username">@{u.username}</span>
                          </td>
                          <td className="font-mono">{u.email}</td>
                          <td className="font-mono text-muted">{u.id.substring(0, 8)}...</td>
                          <td>
                            {u.createdAt !== 'N/A'
                              ? new Date(u.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : 'N/A'}
                          </td>
                          <td>
                            <span className="status-badge active">Active User</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
