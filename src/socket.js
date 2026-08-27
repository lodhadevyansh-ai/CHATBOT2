import { io } from 'socket.io-client';

// Determine Socket server URL (uses window location host or default port 5000 in dev)
const SOCKET_URL = window.location.origin.includes('5173') || window.location.origin.includes('localhost')
  ? 'http://localhost:5000'
  : window.location.origin;

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.onlineUsers = [];
    this.onlineCount = 0;
    this.pingLatency = 0;
  }

  connect(authToken = null, user = null) {
    const token = authToken || localStorage.getItem('chatbot_token');

    if (this.socket) {
      this.socket.auth = token ? { token } : {};
      if (this.socket.connected) {
        this.socket.emit('user:authenticate', { token, user });
      }
      this.socket.disconnect().connect();
      return this.socket;
    }
    
    this.socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.measurePing();
      if (token || user) {
        this.socket.emit('user:authenticate', { token, user });
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('online_users_update', (data) => {
      this.onlineCount = data.count || 0;
      this.onlineUsers = data.users || [];
    });

    return this.socket;
  }

  updateAuthToken(token, user = null) {
    if (this.socket) {
      this.socket.auth = token ? { token } : {};
      if (this.socket.connected) {
        this.socket.emit('user:authenticate', { token, user });
      }
      this.socket.disconnect().connect();
    } else {
      this.connect(token, user);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  emitTypingStart(conversationId = null) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  emitTypingStop(conversationId = null) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  sendInstantMessage(msgPayload) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message:send_instant', msgPayload);
    }
  }

  measurePing(callback) {
    if (!this.socket || !this.socket.connected) return;
    const startTime = Date.now();
    this.socket.emit('ping_check', startTime, () => {
      const latency = Math.max(1, Date.now() - startTime);
      this.pingLatency = latency;
      if (typeof callback === 'function') callback(latency);
    });
  }

  subscribe(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }
}

export const socketManager = new SocketManager();
