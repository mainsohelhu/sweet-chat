// api/index.js - Vercel Serverless Function entrypoint
// This file bridges the Express app to Vercel's serverless runtime.

const app = require('../backend/server');

module.exports = app;
