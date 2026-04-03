/**
 * Auth Controller
 * Handles signup, login (email/phone), logout, token refresh, password reset
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

// ─── Signup ───────────────────────────────────────────────────────────────────
exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { displayName, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or phone already exists.',
      });
    }

    // Create user
    const user = await User.create({ displayName, email, phone, password });

    // Generate verification token (email)
    if (email) {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
      user.verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24h
      await user.save();

      const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
      await sendEmail({
        to: email,
        subject: 'Welcome to Sweetchat - Verify Your Email',
        html: `
          <h2>Welcome to Sweetchat, ${displayName}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verifyUrl}" style="background:#6C63FF;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
            Verify Email
          </a>
          <p>This link expires in 24 hours.</p>
        `,
      }).catch(console.error); // Don't fail signup if email fails
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens = [refreshToken];
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
};

// ─── Login (Email or Phone) ───────────────────────────────────────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { identifier, password } = req.body;

    // Find by email or phone
    const isEmail = identifier.includes('@');
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    ).select('+password +refreshTokens');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Add refresh token (keep max 5 sessions)
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      success: true,
      user: user.toPublicProfile(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id).select('+refreshTokens');

    if (user && refreshToken) {
      user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken);
    }
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !(user.refreshTokens || []).includes(refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newAccessToken = generateToken(user._id);

    // Keep the same refresh token to prevent race conditions across tabs/concurrent requests
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({ success: true, accessToken: newAccessToken, refreshToken: refreshToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token expired or invalid.' });
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.trim()?.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || req.headers.origin || req.get('referer')?.replace(/\/$/, '') || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Sweetchat - Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="background:#6C63FF;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">
          Reset Password
        </a>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reset email.' });
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicProfile() });
};

// ─── Send OTP (for phone signup/login) ───────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in DB (works for both existing and new users)
    let user = await User.findOne({ phone });
    if (user) {
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save();
    }
    // For new users, just store in a temp way — we verify during signup
    // Store globally keyed by phone for 10 minutes
    global._otpStore = global._otpStore || {};
    global._otpStore[phone] = { otp, expire: otpExpire };

    // Only use Twilio if real credentials are configured (SID starts with AC)
    const hasTwilio = process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') && 
                      process.env.TWILIO_AUTH_TOKEN?.length > 10;

    if (hasTwilio) {
      const { sendSMS } = require('../utils/sms');
      await sendSMS({ to: phone, body: `Your Sweetchat OTP is: ${otp}. Valid for 10 minutes.` });
      console.log(`📱 OTP sent via SMS to ${phone}`);
    } else {
      // Dev mode — log OTP to backend console
      console.log(`\n📱 ===== DEV OTP =====`);
      console.log(`📱 Phone: ${phone}`);
      console.log(`📱 OTP:   ${otp}`);
      console.log(`📱 =====================\n`);
    }

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // Only expose OTP in development mode
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ─── Verify OTP (for phone signup) ───────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

    const stored = global._otpStore?.[phone];
    if (!stored) return res.status(400).json({ success: false, message: 'OTP not found. Request a new one.' });
    if (new Date() > stored.expire) return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    // Clear OTP
    delete global._otpStore[phone];

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// ─── Login with OTP (phone login) ────────────────────────────────────────────
exports.loginWithOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

    const stored = global._otpStore?.[phone];
    if (!stored) return res.status(400).json({ success: false, message: 'OTP not found. Request a new one.' });
    if (new Date() > stored.expire) return res.status(400).json({ success: false, message: 'OTP expired.' });
    if (stored.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this number. Please sign up.' });

    // Clear OTP
    delete global._otpStore[phone];

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({ success: true, user: user.toPublicProfile(), accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};
