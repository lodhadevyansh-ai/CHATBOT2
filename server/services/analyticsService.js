import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

const serverStartTime = Date.now();

// Initial default structure
const defaultAnalytics = {
  totalMessages: 0,
  guestCount: 0,
  dailyStats: {}, // e.g. "2026-08-13": { messages: 15, activeUsers: ["user1"], newSignups: 0, commands: {}, models: {} }
  commandUsage: {
    '/image': 0,
    '/code': 0,
    '/web': 0,
    '/translate': 0,
    '/memory': 0,
    '/voice': 0,
    '/prompt': 0,
    '/help': 0
  },
  modelUsage: {
    'auto': 0,
    'gemini': 0,
    'openai': 0,
    'copilot': 0
  },
  featureUsage: {
    'image_generation': 0,
    'code_assistant': 0,
    'translation': 0,
    'memory_operation': 0
  },
  languageUsage: {
    'en': 0
  },
  latencyStats: {
    'auto': { totalMs: 0, count: 0, minMs: 999999, maxMs: 0 },
    'gemini': { totalMs: 0, count: 0, minMs: 999999, maxMs: 0 },
    'openai': { totalMs: 0, count: 0, minMs: 999999, maxMs: 0 },
    'copilot': { totalMs: 0, count: 0, minMs: 999999, maxMs: 0 }
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAnalytics() {
  try {
    ensureDataDir();
    if (!fs.existsSync(ANALYTICS_FILE)) {
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(defaultAnalytics, null, 2), 'utf-8');
      return { ...defaultAnalytics };
    }
    const raw = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultAnalytics,
      ...parsed,
      commandUsage: { ...defaultAnalytics.commandUsage, ...(parsed.commandUsage || {}) },
      modelUsage: { ...defaultAnalytics.modelUsage, ...(parsed.modelUsage || {}) },
      featureUsage: { ...defaultAnalytics.featureUsage, ...(parsed.featureUsage || {}) },
      languageUsage: { ...defaultAnalytics.languageUsage, ...(parsed.languageUsage || {}) },
      latencyStats: { ...defaultAnalytics.latencyStats, ...(parsed.latencyStats || {}) }
    };
  } catch (err) {
    console.error('Error loading analytics file, using default:', err);
    return { ...defaultAnalytics };
  }
}

function saveAnalytics(data) {
  try {
    ensureDataDir();
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving analytics data:', err);
  }
}

let analyticsState = loadAnalytics();

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function ensureTodayStats() {
  const todayKey = getTodayKey();
  if (!analyticsState.dailyStats) analyticsState.dailyStats = {};
  if (!analyticsState.dailyStats[todayKey]) {
    analyticsState.dailyStats[todayKey] = {
      messages: 0,
      activeUsers: [],
      newSignups: 0,
      commands: {},
      models: {}
    };
  }
  return todayKey;
}

export const analyticsService = {
  // Track new message generated
  trackMessage: ({ userId, isGuest = false, model = 'auto', latencyMs = 0, command = null, language = 'en' }) => {
    try {
      const todayKey = ensureTodayStats();
      const today = analyticsState.dailyStats[todayKey];

      analyticsState.totalMessages = (analyticsState.totalMessages || 0) + 1;
      today.messages = (today.messages || 0) + 1;

      // Active user tracking
      const userIdentifier = userId || (isGuest ? 'guest' : 'anonymous');
      if (isGuest && (!analyticsState.guestCount || analyticsState.guestCount < 1)) {
        analyticsState.guestCount = 1;
      }
      if (isGuest && !today.activeUsers.includes('guest')) {
        analyticsState.guestCount = (analyticsState.guestCount || 0) + 1;
      }
      if (!today.activeUsers.includes(userIdentifier)) {
        today.activeUsers.push(userIdentifier);
      }

      // Model usage
      const normalizedModel = (model || 'auto').toLowerCase();
      analyticsState.modelUsage[normalizedModel] = (analyticsState.modelUsage[normalizedModel] || 0) + 1;
      today.models[normalizedModel] = (today.models[normalizedModel] || 0) + 1;

      // Command usage
      if (command) {
        const cmdKey = command.startsWith('/') ? command.split(' ')[0].toLowerCase() : `/${command.toLowerCase()}`;
        analyticsState.commandUsage[cmdKey] = (analyticsState.commandUsage[cmdKey] || 0) + 1;
        if (!today.commands) today.commands = {};
        today.commands[cmdKey] = (today.commands[cmdKey] || 0) + 1;
      }

      // Language tracking
      if (language) {
        const langKey = language.toLowerCase();
        analyticsState.languageUsage[langKey] = (analyticsState.languageUsage[langKey] || 0) + 1;
      }

      // Latency stats
      if (latencyMs > 0) {
        if (!analyticsState.latencyStats[normalizedModel]) {
          analyticsState.latencyStats[normalizedModel] = { totalMs: 0, count: 0, minMs: 999999, maxMs: 0 };
        }
        const stat = analyticsState.latencyStats[normalizedModel];
        stat.totalMs += latencyMs;
        stat.count += 1;
        if (latencyMs < stat.minMs) stat.minMs = latencyMs;
        if (latencyMs > stat.maxMs) stat.maxMs = latencyMs;
      }

      saveAnalytics(analyticsState);
    } catch (err) {
      console.error('Error tracking message in analyticsService:', err);
    }
  },

  // Track user signup
  trackSignup: () => {
    try {
      const todayKey = ensureTodayStats();
      analyticsState.dailyStats[todayKey].newSignups = (analyticsState.dailyStats[todayKey].newSignups || 0) + 1;
      saveAnalytics(analyticsState);
    } catch (err) {
      console.error('Error tracking signup in analyticsService:', err);
    }
  },

  // Track feature execution (image_generation, code_assistant, translation, memory_operation)
  trackFeature: (featureName, model = 'auto') => {
    try {
      if (!analyticsState.featureUsage) analyticsState.featureUsage = {};
      analyticsState.featureUsage[featureName] = (analyticsState.featureUsage[featureName] || 0) + 1;

      if (model && model !== 'auto') {
        const normalizedModel = model.toLowerCase();
        analyticsState.modelUsage[normalizedModel] = (analyticsState.modelUsage[normalizedModel] || 0) + 1;
      }

      saveAnalytics(analyticsState);
    } catch (err) {
      console.error('Error tracking feature in analyticsService:', err);
    }
  },

  // Get complete analytics dashboard data with timeRange filtering ('today' | '7days' | '30days' | 'all')
  getDashboardData: (timeRange = 'all', onlineSocketCount = 0) => {
    ensureTodayStats();
    const todayKey = getTodayKey();
    const todayData = analyticsState.dailyStats[todayKey] || { messages: 0, activeUsers: [], newSignups: 0 };

    const allUsers = db.getAllUsers ? db.getAllUsers() : [];
    const totalRegisteredUsers = allUsers.length;

    // Filter calculations based on timeRange
    const now = new Date();
    let daysToInclude = 9999;
    if (timeRange === 'today') daysToInclude = 1;
    else if (timeRange === '7days') daysToInclude = 7;
    else if (timeRange === '30days') daysToInclude = 30;

    let filteredMessages = 0;
    const filteredCommands = { ...analyticsState.commandUsage };
    const filteredModels = { ...analyticsState.modelUsage };

    if (timeRange !== 'all') {
      // Reset counters for filtered aggregation
      Object.keys(filteredCommands).forEach(k => { filteredCommands[k] = 0; });
      Object.keys(filteredModels).forEach(k => { filteredModels[k] = 0; });

      Object.entries(analyticsState.dailyStats || {}).forEach(([dateStr, dayObj]) => {
        const dayDate = new Date(dateStr);
        const diffDays = Math.floor((now - dayDate) / (1000 * 60 * 60 * 24));
        if (diffDays < daysToInclude) {
          filteredMessages += (dayObj.messages || 0);

          if (dayObj.commands) {
            Object.entries(dayObj.commands).forEach(([cmd, cnt]) => {
              filteredCommands[cmd] = (filteredCommands[cmd] || 0) + cnt;
            });
          }

          if (dayObj.models) {
            Object.entries(dayObj.models).forEach(([mdl, cnt]) => {
              filteredModels[mdl] = (filteredModels[mdl] || 0) + cnt;
            });
          }
        }
      });
    } else {
      filteredMessages = analyticsState.totalMessages || 0;
    }

    // Calculate latency metrics
    const latencySummary = {};
    Object.keys(analyticsState.latencyStats || {}).forEach(m => {
      const s = analyticsState.latencyStats[m];
      latencySummary[m] = {
        avgMs: s.count > 0 ? Math.round(s.totalMs / s.count) : 0,
        minMs: s.minMs === 999999 ? 0 : s.minMs,
        maxMs: s.maxMs,
        totalCalls: s.count
      };
    });

    // Generate past 7 days timeline data for charts
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStats = analyticsState.dailyStats[dateStr] || { messages: 0, activeUsers: [], newSignups: 0 };
      timeline.push({
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        messages: dayStats.messages || 0,
        activeUsers: (dayStats.activeUsers || []).length,
        newSignups: dayStats.newSignups || 0
      });
    }

    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

    return {
      timeRange,
      kpi: {
        totalUsers: totalRegisteredUsers + (analyticsState.guestCount || 0),
        registeredUsers: totalRegisteredUsers,
        guestUsers: analyticsState.guestCount || 0,
        todaysActiveUsers: (todayData.activeUsers || []).length,
        todaysSignups: todayData.newSignups || 0,
        onlineUsersNow: onlineSocketCount,
        totalMessagesSent: filteredMessages,
        todaysMessagesSent: todayData.messages || 0,
        serverUptimeSeconds: uptimeSeconds
      },
      commandUsage: filteredCommands,
      modelUsage: filteredModels,
      featureUsage: analyticsState.featureUsage,
      languageUsage: analyticsState.languageUsage,
      latencyStats: latencySummary,
      timeline,
      userList: allUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        createdAt: u.createdAt || 'N/A'
      }))
    };
  },

  // Reset or clear analytics data (Admin action)
  resetAnalytics: () => {
    analyticsState = {
      ...defaultAnalytics,
      dailyStats: {}
    };
    saveAnalytics(analyticsState);
    return analyticsState;
  }
};
