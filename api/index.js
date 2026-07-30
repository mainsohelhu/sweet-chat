// api/index.js - Root Vercel Serverless Function entrypoint
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (e) {}

const app = require('../backend/server');

module.exports = app;
