import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import analyticsRoutes from './routes/analytics.js';
import { connectDB } from './db/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// HTTP Server & Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected users: socket.id => { socketId, userId, username, isGuest, connectedAt }
const connectedUsers = new Map();

const broadcastOnlineUsers = () => {
  const usersList = Array.from(connectedUsers.values()).map(u => ({
    socketId: u.socketId,
    userId: u.userId,
    username: u.username,
    isGuest: u.isGuest,
    connectedAt: u.connectedAt
  }));

  io.emit('online_users_update', {
    count: usersList.length,
    users: usersList
  });
};

io.on('connection', (socket) => {
  let userInfo = {
    socketId: socket.id,
    userId: null,
    username: `Guest-${socket.id.substring(0, 5)}`,
    isGuest: true,
    connectedAt: new Date().toISOString()
  };

  // Try to authenticate socket user if token provided
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        userInfo = {
          socketId: socket.id,
          userId: decoded.id,
          username: decoded.username || `User-${decoded.id}`,
          isGuest: false,
          connectedAt: new Date().toISOString()
        };
      }
    } catch {
      // Invalid token fallback to guest
    }
  }

  connectedUsers.set(socket.id, userInfo);
  console.log(`⚡ Socket connected: ${socket.id} (${userInfo.username})`);
  
  // Broadcast updated online users list
  broadcastOnlineUsers();

  // Send welcome ack to client with initial presence data
  socket.emit('socket:connected', {
    socketId: socket.id,
    user: userInfo,
    onlineCount: connectedUsers.size
  });

  // Client requests current online users
  socket.on('users:get_online', () => {
    socket.emit('online_users_update', {
      count: connectedUsers.size,
      users: Array.from(connectedUsers.values())
    });
  });

  // Client re-authenticates socket user on login or account switch
  socket.on('user:authenticate', (data = {}) => {
    const token = data.token || socket.handshake.auth?.token;
    const clientUser = data.user;
    let updated = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          userInfo.userId = decoded.id;
          userInfo.username = decoded.username || (clientUser && (clientUser.username || clientUser.name)) || `User-${decoded.id}`;
          userInfo.isGuest = false;
          updated = true;
        }
      } catch (err) {
        // Fallback to clientUser if token verify fails
      }
    }

    if (!updated && clientUser && (clientUser.username || clientUser.name)) {
      userInfo.username = clientUser.username || clientUser.name;
      userInfo.userId = clientUser.id || userInfo.userId;
      userInfo.isGuest = false;
      updated = true;
    }

    if (updated) {
      connectedUsers.set(socket.id, userInfo);
      broadcastOnlineUsers();
    }
  });

  // Real-Time Typing events
  socket.on('typing:start', (data = {}) => {
    socket.broadcast.emit('user_typing_start', {
      socketId: socket.id,
      username: userInfo.username,
      userId: userInfo.userId,
      isGuest: userInfo.isGuest,
      conversationId: data.conversationId || null
    });
  });

  socket.on('typing:stop', (data = {}) => {
    socket.broadcast.emit('user_typing_stop', {
      socketId: socket.id,
      username: userInfo.username,
      userId: userInfo.userId,
      conversationId: data.conversationId || null
    });
  });

  // Real-Time Instant Messages event
  socket.on('message:send_instant', (msgData) => {
    socket.broadcast.emit('instant_message_received', {
      ...msgData,
      senderUsername: userInfo.username,
      senderSocketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Ping event for measuring connection latency
  socket.on('ping_check', (clientTime, callback) => {
    if (typeof callback === 'function') {
      callback(new Date().getTime());
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id} (${userInfo.username})`);
    connectedUsers.delete(socket.id);
    
    // Broadcast user stopped typing when disconnected
    socket.broadcast.emit('user_typing_stop', { socketId: socket.id, username: userInfo.username });
    
    // Broadcast updated online users
    broadcastOnlineUsers();
  });
});

// Attach socket io instance to app for express route handlers
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint with socket status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    realtime: {
      socketConnectedCount: connectedUsers.size
    }
  });
});

// Serve static frontend assets (built Vite app) in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();

  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Express error handling middleware to prevent process crash
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error handler:', err.message);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request payload.' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

// Connect to MongoDB Database
connectDB();

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the process using port ${PORT} or restart your terminal.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Authentication & Real-Time Socket.io Server running on http://localhost:${PORT}`);
});

