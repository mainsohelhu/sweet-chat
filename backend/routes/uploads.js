// routes/uploads.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const path = require('path');
const { protect } = require('../middleware/auth');
const fs = require('fs');

// ─── Universal File Filter ───────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|ogg|wav|pdf|doc|docx|xls|xlsx|zip/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

let upload;

// ─── Auto-Routing Storage Engine ─────────────────────────────────────────────
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION && process.env.AWS_S3_BUCKET) {
  // CLOUD STORAGE: Stream directly to Amazon S3
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  
  const s3 = new AWS.S3();
  
  const s3Storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    // acl: 'public-read', // Deprecated in modern S3 buckets, rely on bucket policy
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
  });

  upload = multer({
    storage: s3Storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter,
  });
  
} else {
  // LOCAL STORAGE: Fallback for developers
  const uploadDir = process.env.UPLOAD_PATH || './uploads';
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });

  upload = multer({
    storage: diskStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB // 50MB
    fileFilter,
  });
}

// ─── Upload Endpoints ────────────────────────────────────────────────────────

// Helper to extract absolute URL based on storage engine
const getFileUrl = (req, file) => {
  if (file.location) {
    // S3 automatically injects .location
    return file.location; 
  } else {
    // Disk storage injects .filename
    const baseUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${file.filename}`;
  }
};

// Upload single file (Posts, Chats, etc)
router.post('/file', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  res.json({
    success: true,
    url: getFileUrl(req, req.file),
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

// Upload personalized avatar
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const User = require('../models/User');
  const url = getFileUrl(req, req.file);
  await User.findByIdAndUpdate(req.user._id, { avatar: url });
  res.json({ success: true, url });
});

module.exports = router;