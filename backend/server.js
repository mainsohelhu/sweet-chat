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
app.set('trust proxy', 1);
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  maxHttpBufferSize: 1e7,
});
app.set('io', io);

// ─── MongoDB Connection Caching for Serverless ─────────────────────────────────
let cachedDb = null;
const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb+srv://sohel:sohel@cluster0.hitpkzn.mongodb.net/mist_db?retryWrites=true&w=majority&appName=Cluster0';
  try {
    cachedDb = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected successfully');
    return cachedDb;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

const rateLimit = require('express-rate-limit');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use(helmet({ 
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: 'cross-origin' } 
}));
app.use(compression());
app.use(morgan('dev'));

// CORS — allow mobile and web clients across all environments
app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.USE_LOCAL_STORAGE === 'true') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Rate limiting for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
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
const fs = require('fs');
if (process.env.NODE_ENV === 'production') {
  const buildPath = fs.existsSync(path.resolve(__dirname, '../frontend/build'))
    ? path.resolve(__dirname, '../frontend/build')
    : path.resolve(__dirname, '../frontend/dist');
  
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
}

// ─── Error Handler (MUST BE LAST) ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err);
  const response = { success: false, message: err.message || 'Server error' };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  res.status(err.statusCode || 500).json(response);
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Sweetchat server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;