const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.cjs');
const sanitize = require('sanitize-html');
const { checkAdminStatus, authenticateAdmin } = require('../middleware/authenticateAdmin.cjs');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sanitize inputs
    const sanitizedEmail = sanitize(email || '').toLowerCase().trim();
    const sanitizedPassword = sanitize(password || '').trim();

    // Validate inputs
    if (!sanitizedEmail || !sanitizedPassword) {
      console.warn('Missing login credentials', { email: sanitizedEmail });
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      console.warn('Invalid email format', { email: sanitizedEmail });
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (sanitizedPassword.length < 6) {
      console.warn('Password too short', { email: sanitizedEmail });
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      console.warn(`Login failed: User not found for email ${sanitizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare plain text password (as requested, not hashed)
    if (user.password !== sanitizedPassword) {
      console.warn(`Login failed: Incorrect password for email ${sanitizedEmail}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`Login successful for ${sanitizedEmail}`);
    res.status(200).json({
      token,
      isAdmin: user.isAdmin,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Check admin status endpoint
router.get('/check-admin', checkAdminStatus);

// ── Get admin profile ──
router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name || '', email: user.email });
  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Update admin profile (name / email) ──
router.put('/profile', authenticateAdmin, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name !== undefined) {
      const sanitized = sanitize(name).trim();
      if (sanitized.length > 100) return res.status(400).json({ error: 'Name is too long' });
      user.name = sanitized;
    }

    if (email !== undefined) {
      const sanitized = sanitize(email).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized))
        return res.status(400).json({ error: 'Invalid email format' });
      const exists = await User.findOne({ email: sanitized, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ error: 'Email already in use' });
      user.email = sanitized;
    }

    await user.save();

    // Issue a fresh JWT with updated email
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Profile updated', name: user.name, email: user.email, token });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── Change password ──
router.put('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const cur = sanitize(currentPassword || '').trim();
    const nw = sanitize(newPassword || '').trim();

    if (!cur || !nw) return res.status(400).json({ error: 'Both fields are required' });
    if (nw.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    if (cur === nw) return res.status(400).json({ error: 'New password must be different from current password' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.password !== cur) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = nw;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;