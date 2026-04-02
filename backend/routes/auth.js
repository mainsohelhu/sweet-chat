// routes/auth.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  signup, login, logout, refreshToken,
  forgotPassword, resetPassword, verifyEmail, getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

router.post(
  '/signup',
  authLimiter,
  [
    body('displayName').trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isMobilePhone(),
    body('password').isLength({ min: 8 }).matches(/\d/).withMessage('Password must contain a number'),
  ],
  signup
);

router.post(
  '/login',
  authLimiter,
  [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty(),
  ],
  login
);

router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);

module.exports = router;

// OTP routes
const { sendOTP, verifyOTP, loginWithOTP } = require('../controllers/authController');
router.post('/send-otp', authLimiter, sendOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/login-otp', authLimiter, loginWithOTP);
