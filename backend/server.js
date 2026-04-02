/**
 * Sweetchat - Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const callRoutes = require('./routes/calls');
const uploadRoutes = require('./routes/uploads');
const friendRoutes = require('./routes/friends');
const storyRoutes = require('./routes/stories');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const initSocketHandlers = require('./socket/socketHandlers');

const app = express();
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  maxHttpBufferSize: 1e7,
});
app.set('io', io);

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sweetchat')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => { console.error('❌ MongoDB error:', err); process.exit(1); });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: 'cross-origin' } 
}));
app.use(compression());
app.use(morgan('dev'));

// CORS — allow everything in development
app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.USE_LOCAL_STORAGE === 'true') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── Socket Handlers ──────────────────────────────────────────────────────────
initSocketHandlers(io);

// ─── API Fallback ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({ success: false, message: 'Route not found' });
  } else {
    next();
  }
});

// ─── Production Frontend Serving ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ─── Error Handler (MUST BE LAST) ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error', stack: err.stack });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Sweetchat server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };