import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB schema structure
const defaultData = {
  users: [],
  conversations: [], // Array of Conversation objects
  chatHistory: {}   // Legacy fallback
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const dataStr = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(dataStr);

    if (!Array.isArray(data.users)) data.users = [];
    if (!Array.isArray(data.conversations)) data.conversations = [];
    if (!Array.isArray(data.memories)) data.memories = [];
    if (!data.chatHistory) data.chatHistory = {};

    return data;
  } catch (err) {
    console.error('Error reading DB file, returning default:', err);
    return defaultData;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

export const db = {
  findUserByEmail: (email) => {
    if (!email) return null;
    const target = String(email).trim().toLowerCase();
    const data = readDb();
    return data.users.find(u => u && u.email && String(u.email).trim().toLowerCase() === target);
  },
  findUserByUsername: (username) => {
    if (!username) return null;
    const target = String(username).trim().toLowerCase();
    const data = readDb();
    return data.users.find(u => u && u.username && String(u.username).trim().toLowerCase() === target);
  },
  findUserById: (id) => {
    if (!id) return null;
    const data = readDb();
    return data.users.find(u => u && u.id === id);
  },
  createUser: (user) => {
    const data = readDb();
    data.users.push(user);
    writeDb(data);
    return user;
  },
  getAllUsers: () => {
    const data = readDb();
    return Array.isArray(data.users) ? data.users : [];
  },
  setResetToken: (userId, token, expiresAt) => {
    const data = readDb();
    const user = data.users.find(u => u && u.id === userId);
    if (!user) return false;
    user.resetToken = token;
    user.resetTokenExpiresAt = expiresAt;
    writeDb(data);
    return true;
  },
  findUserByResetToken: (token) => {
    if (!token) return null;
    const data = readDb();
    const now = new Date().toISOString();
    return data.users.find(u => u && u.resetToken === token && u.resetTokenExpiresAt && u.resetTokenExpiresAt > now);
  },
  updateUserPassword: (userId, newPasswordHash) => {
    const data = readDb();
    const user = data.users.find(u => u && u.id === userId);
    if (!user) return false;
    user.passwordHash = newPasswordHash;
    delete user.resetToken;
    delete user.resetTokenExpiresAt;
    writeDb(data);
    return true;
  },

  // --- Conversations Management ---

  getConversationsByUser: (userId, searchQuery = '') => {
    const data = readDb();
    let userConvs = data.conversations.filter(c => c.userId === userId);

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      userConvs = userConvs.filter(c => {
        const titleMatch = c.title && c.title.toLowerCase().includes(q);
        const msgMatch = Array.isArray(c.messages) && c.messages.some(m => 
          (m.question && m.question.toLowerCase().includes(q)) ||
          (m.answer && m.answer.toLowerCase().includes(q))
        );
        return titleMatch || msgMatch;
      });
    }

    // Sort by updatedAt descending
    return userConvs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  getConversationById: (convId, userId) => {
    const data = readDb();
    return data.conversations.find(c => c.id === convId && c.userId === userId);
  },

  createConversation: (userId, title = 'New Chat', initialMessages = []) => {
    const data = readDb();
    const now = new Date().toISOString();
    const newConv = {
      id: crypto.randomUUID(),
      userId,
      title: title || 'New Chat',
      createdAt: now,
      updatedAt: now,
      messages: initialMessages
    };
    data.conversations.push(newConv);
    writeDb(data);
    return newConv;
  },

  addMessageToConversation: (convId, userId, { question, answer, attachments }) => {
    const data = readDb();
    const convIndex = data.conversations.findIndex(c => c.id === convId && c.userId === userId);
    
    const now = new Date().toISOString();
    const newMsg = {
      id: crypto.randomUUID(),
      question,
      answer,
      attachments: Array.isArray(attachments) ? attachments.map(a => ({
        name: a.name,
        type: a.type || a.mimeType,
        mimeType: a.mimeType,
        isImage: a.isImage || (a.mimeType && a.mimeType.startsWith('image/')),
        data: a.data
      })) : [],
      timestamp: now
    };

    if (convIndex !== -1) {
      const conv = data.conversations[convIndex];
      conv.messages.push(newMsg);
      conv.updatedAt = now;

      // Auto-title if it's currently "New Chat" or default
      if (conv.title === 'New Chat' || !conv.title) {
        conv.title = question.length > 30 ? question.substring(0, 30) + '...' : question;
      }
      writeDb(data);
      return { conversation: conv, message: newMsg };
    } else {
      // If conversation doesn't exist, create it
      const autoTitle = question.length > 30 ? question.substring(0, 30) + '...' : question;
      const newConv = {
        id: convId || crypto.randomUUID(),
        userId,
        title: autoTitle,
        createdAt: now,
        updatedAt: now,
        messages: [newMsg]
      };
      data.conversations.push(newConv);
      writeDb(data);
      return { conversation: newConv, message: newMsg };
    }
  },

  renameConversation: (convId, userId, newTitle) => {
    const data = readDb();
    const conv = data.conversations.find(c => c.id === convId && c.userId === userId);
    if (!conv) return null;

    conv.title = newTitle.trim() || 'Untitled Chat';
    conv.updatedAt = new Date().toISOString();
    writeDb(data);
    return conv;
  },

  deleteConversation: (convId, userId) => {
    const data = readDb();
    const initialLen = data.conversations.length;
    data.conversations = data.conversations.filter(c => !(c.id === convId && c.userId === userId));
    writeDb(data);
    return data.conversations.length < initialLen;
  },

  clearAllConversationsByUser: (userId) => {
    const data = readDb();
    if (!Array.isArray(data.conversations)) return false;
    data.conversations = data.conversations.filter(c => c.userId !== userId);
    if (data.chatHistory && data.chatHistory[userId]) {
      delete data.chatHistory[userId];
    }
    writeDb(data);
    return true;
  },

  // --- Legacy Compatibility & Account Deletion ---

  getChatHistory: (userId) => {
    const data = readDb();
    const convs = data.conversations.filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (convs.length > 0) {
      // Flatten messages from all conversations or recent conversation
      const allMsgs = [];
      convs[0].messages.forEach(m => {
        allMsgs.push({ id: m.id + '-q', sender: 'user', message: m.question });
        allMsgs.push({ id: m.id + '-a', sender: 'robot', message: m.answer });
      });
      return allMsgs;
    }

    return data.chatHistory[userId] || [];
  },

  saveChatHistory: (userId, messages) => {
    const data = readDb();
    data.chatHistory[userId] = messages;
    writeDb(data);
    return messages;
  },

  // --- Local Fallback Memories Storage ---

  getMemoriesByUser: (userId) => {
    const data = readDb();
    return (data.memories || []).filter(m => m.userId === userId);
  },

  upsertMemory: (userId, key, value, rawText = '', category = 'fact') => {
    const data = readDb();
    if (!Array.isArray(data.memories)) data.memories = [];

    const normalizedKey = key.trim().toLowerCase();
    const existingIndex = data.memories.findIndex(m => m.userId === userId && m.key.trim().toLowerCase() === normalizedKey);
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      data.memories[existingIndex] = {
        ...data.memories[existingIndex],
        value,
        rawText: rawText || data.memories[existingIndex].rawText,
        category: category || data.memories[existingIndex].category,
        updatedAt: now
      };
      writeDb(data);
      return data.memories[existingIndex];
    } else {
      const newMemory = {
        id: crypto.randomUUID(),
        userId,
        key: key.trim(),
        value: value.trim(),
        rawText,
        category,
        createdAt: now,
        updatedAt: now
      };
      data.memories.push(newMemory);
      writeDb(data);
      return newMemory;
    }
  },

  deleteMemoryById: (userId, memoryId) => {
    const data = readDb();
    if (!Array.isArray(data.memories)) return false;
    const initialLen = data.memories.length;
    data.memories = data.memories.filter(m => !(m.userId === userId && (m.id === memoryId || m._id === memoryId)));
    writeDb(data);
    return data.memories.length < initialLen;
  },

  clearMemoriesByUser: (userId) => {
    const data = readDb();
    if (!Array.isArray(data.memories)) return false;
    data.memories = data.memories.filter(m => m.userId !== userId);
    writeDb(data);
    return true;
  },

  deleteUser: (userId) => {
    const data = readDb();
    const initialCount = data.users.length;
    data.users = data.users.filter(u => u.id !== userId);
    
    if (data.chatHistory && data.chatHistory[userId]) {
      delete data.chatHistory[userId];
    }

    if (Array.isArray(data.conversations)) {
      data.conversations = data.conversations.filter(c => c.userId !== userId);
    }

    if (Array.isArray(data.memories)) {
      data.memories = data.memories.filter(m => m.userId !== userId);
    }

    writeDb(data);
    return data.users.length < initialCount;
  }
};

