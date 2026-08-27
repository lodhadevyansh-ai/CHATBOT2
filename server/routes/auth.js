import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';
import { analyticsService } from '../services/analyticsService.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check existing
    if (db.findUserByEmail(email)) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    if (db.findUserByUsername(username)) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Secure password hashing
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
      id: crypto.randomUUID(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    analyticsService.trackSignup(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body; // Can be username or email

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Please enter your email/username and password.' });
    }

    const user = db.findUserByEmail(loginIdentifier) || db.findUserByUsername(loginIdentifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials. Password record missing.' });
    }

    // Compare password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Logged in successfully!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
});

// POST /api/auth/forgot-password - Request password reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { emailOrUsername } = req.body;
    if (!emailOrUsername || !emailOrUsername.trim()) {
      return res.status(400).json({ error: 'Please enter your registered email address or username.' });
    }

    const identifier = emailOrUsername.trim();
    const user = db.findUserByEmail(identifier) || db.findUserByUsername(identifier);
    if (!user) {
      return res.status(404).json({ error: 'No account found matching this email address or username.' });
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    db.setResetToken(user.id, resetCode, expiresAt);

    res.json({
      message: `Password reset verification code generated for ${user.username}.`,
      resetToken: resetCode,
      email: user.email,
      username: user.username
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error while generating password reset request.' });
  }
});

// POST /api/auth/reset-password - Create new password using verification code
router.post('/reset-password', async (req, res) => {
  try {
    const { emailOrUsername, resetToken, newPassword } = req.body;
    if (!emailOrUsername || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Username/Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const identifier = emailOrUsername.trim();
    const user = db.findUserByEmail(identifier) || db.findUserByUsername(identifier);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const now = new Date().toISOString();
    if (!user.resetToken || user.resetToken !== resetToken.trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < now) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    const success = db.updateUserPassword(user.id, newPasswordHash);
    if (!success) {
      return res.status(500).json({ error: 'Failed to update user password.' });
    }

    res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
});

// DELETE /api/auth/delete-account
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation is required to delete your account.' });
    }

    const user = db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect password. Account deletion canceled.' });
    }

    const deleted = db.deleteUser(req.user.id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete user account. Please try again.' });
    }

    res.json({ message: 'Your account and chat history have been permanently deleted.' });

  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Server error during account deletion. Please try again.' });
  }
});

export default router;
