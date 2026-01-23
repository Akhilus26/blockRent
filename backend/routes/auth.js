import express from 'express';
import crypto from 'crypto';
import db from '../database.js';

const router = express.Router();

// Simple mock authentication middleware (no JWT)
// In a real app, you'd use sessions or JWT, but for this mock, we just check localStorage on frontend
function getUserIdFromRequest(req) {
  // For mock auth, we'll accept userId from headers (set by frontend)
  // In production, this would come from a session or JWT
  return req.headers['x-user-id'] || null;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Hash password for comparison
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, hashedPassword);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['admin', 'landlord', 'tenant'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const userId = crypto.randomUUID();

    // Set status to 'approved' for landlords and tenants (no admin approval needed)
    // Admin users should not register through this endpoint, but if they do, keep as 'pending'
    const userStatus = (role === 'landlord' || role === 'tenant') ? 'approved' : 'pending';

    // Insert user
    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, name, hashedPassword, role, userStatus, phone || null);

    // Get created user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      user: userWithoutPassword,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/profile
router.get('/profile', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, userId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const hashedOldPassword = crypto.createHash('sha256').update(oldPassword).digest('hex');

    if (user.password !== hashedOldPassword) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    const hashedNewPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNewPassword, userId);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
