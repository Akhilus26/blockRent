import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import db from '../database.js';
import {
  uploadIdentity,
  validateFileMagicBytes,
  getSafeFilePath,
  SECURE_IDENTITY_DIR
} from '../utils/fileSecurity.js';

const router = express.Router();

// Simple mock authentication middleware (no JWT)
function getUserIdFromRequest(req) {
  return req.headers['x-user-id'] || null;
}

// Sanitize user object for client responses
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...sanitized } = user;
  return sanitized;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, hashedPassword);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isDeleted === 1 || user.isActive === 0) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact administrator.' });
    }

    res.json({
      user: sanitizeUser(user),
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register (Handles both JSON and multipart form data with identityDocument)
router.post('/register', (req, res) => {
  uploadIdentity.single('identityDocument')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error uploading identity document' });
    }

    try {
      const { name, email, password, role, phone, identityDocumentType } = req.body;

      if (!name || !email || !password || !role) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
      }

      if (!['admin', 'landlord', 'tenant'].includes(role)) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if user already exists
      const existingUser = db.prepare('SELECT id, isDeleted, isActive FROM users WHERE email = ?').get(email);
      if (existingUser) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (existingUser.isDeleted === 1 || existingUser.isActive === 0) {
          return res.status(400).json({ error: 'An account with this email was previously deactivated. Please contact administrator.' });
        }
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      let verificationStatus = 'verified';
      let identityDocument = null;
      let identityDocumentName = null;
      let docType = identityDocumentType || 'Aadhaar Card';

      // Tenant identity document enforcement
      if (role === 'tenant') {
        if (!req.file) {
          return res.status(400).json({
            error: 'Identity document is required for tenant registration (PDF, JPEG, or PNG, max 5MB).'
          });
        }

        // Validate magic bytes
        const isValidSignature = validateFileMagicBytes(req.file.path);
        if (!isValidSignature) {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({
            error: 'Corrupted or unsupported file format. Please upload a genuine PDF, JPEG, or PNG document.'
          });
        }

        verificationStatus = 'pending';
        identityDocument = req.file.filename;
        identityDocumentName = req.file.originalname;
      } else {
        // Non-tenant should not store identity documents here
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }

      // Hash password
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      const userId = crypto.randomUUID();
      const userStatus = 'approved';

      // Insert user
      db.prepare(`
        INSERT INTO users (
          id, email, name, password, role, status, phone,
          verificationStatus, identityDocument, identityDocumentName, identityDocumentType
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        email,
        name,
        hashedPassword,
        role,
        userStatus,
        phone || null,
        verificationStatus,
        identityDocument,
        identityDocumentName,
        docType
      );

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

      res.status(201).json({
        user: sanitizeUser(user),
        message: role === 'tenant'
          ? 'Registration successful! Your identity document is pending verification by the admin.'
          : 'Registration successful!'
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// POST /api/auth/resubmit-identity (Tenant resubmits identity document after rejection)
router.post('/resubmit-identity', (req, res) => {
  uploadIdentity.single('identityDocument')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error uploading identity document' });
    }

    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isDeleted === 1 || user.isActive === 0) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'This account has been deactivated.' });
      }

      if (user.role !== 'tenant') {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Only tenants can submit identity documents' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'New identity document file is required' });
      }

      // Check magic bytes
      const isValid = validateFileMagicBytes(req.file.path);
      if (!isValid) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'Corrupted or unsupported file format. Please upload a genuine PDF, JPEG, or PNG document.'
        });
      }

      // Remove old identity document if present
      if (user.identityDocument) {
        const oldPath = getSafeFilePath(SECURE_IDENTITY_DIR, user.identityDocument);
        if (oldPath && fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            console.warn('Could not delete old identity file:', e.message);
          }
        }
      }

      const docType = req.body.identityDocumentType || user.identityDocumentType || 'Aadhaar Card';

      // Update user status back to pending, clear rejectionReason
      db.prepare(`
        UPDATE users 
        SET verificationStatus = 'pending',
            identityDocument = ?,
            identityDocumentName = ?,
            identityDocumentType = ?,
            rejectionReason = NULL
        WHERE id = ?
      `).run(req.file.filename, req.file.originalname, docType, userId);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

      res.json({
        user: sanitizeUser(updatedUser),
        message: 'Identity document resubmitted successfully. It is now pending admin review.'
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Resubmit identity error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
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

    if (user.isDeleted === 1 || user.isActive === 0) {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }

    res.json({ user: sanitizeUser(user) });
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

    const existing = db.prepare('SELECT isDeleted, isActive FROM users WHERE id = ?').get(userId);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.isDeleted === 1 || existing.isActive === 0) {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }

    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, userId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json({ user: sanitizeUser(user), message: 'Profile updated successfully' });
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

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isDeleted === 1 || user.isActive === 0) {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }
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
