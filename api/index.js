// api/index.js - Vercel Serverless Function entrypoint
// This file bridges the Express app to Vercel's serverless runtime.

// Vercel already has process.env set from Dashboard — dotenv is not needed here
// but server.js calls dotenv.config() which is harmless in serverless

const app = require('../backend/server');

// Add a diagnostic endpoint to help debug serverless issues
app.get('/api/debug', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    mongoState: mongoose.connection.readyState,
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    mongoStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasEmailUser: !!process.env.EMAIL_USER,
      vercel: !!process.env.VERCEL,
      vercelUrl: process.env.VERCEL_URL || null,
    }
  });
});

module.exports = app;
