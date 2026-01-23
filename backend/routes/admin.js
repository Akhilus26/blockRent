import express from 'express';
import db from '../database.js';

const router = express.Router();

// Simple auth helper (mock - no JWT)
function getUserIdFromRequest(req) {
  return req.headers['x-user-id'] || null;
}

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all();

    // Remove passwords from response
    const usersWithoutPasswords = users.map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    res.json({ users: usersWithoutPasswords });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Update user status
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('approved', id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id/reject
router.patch('/users/:id/reject', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Update user status
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('rejected', id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const pendingUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('pending').count;
    const approvedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = ?').get('approved').count;
    const totalProperties = db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
    const pendingProperties = db.prepare('SELECT COUNT(*) as count FROM properties WHERE status = ?').get('pending').count;
    const totalAgreements = db.prepare('SELECT COUNT(*) as count FROM agreements').get().count;
    const rentedProperties = db.prepare('SELECT COUNT(*) as count FROM properties WHERE availability = ?').get('rented').count;

    res.json({
      stats: {
        totalUsers: Number(totalUsers),
        pendingUsers: Number(pendingUsers),
        approvedUsers: Number(approvedUsers),
        totalProperties: Number(totalProperties),
        pendingProperties: Number(pendingProperties),
        totalAgreements: Number(totalAgreements),
        rentedProperties: Number(rentedProperties),
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Prevent deleting self
    if (userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete associated data (cascade or manual clean up implies heavy logic, for now basic user delete)
    // Ideally we should delete properties, requests, agreements etc. 
    // For MVP/Demo: Just delete the user. Foreign key constraints might error if they exist.
    // Assuming SQLite foreign keys are ON DELETE CASCADE or loose.

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/agreements
router.get('/agreements', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const agreements = db.prepare('SELECT * FROM agreements ORDER BY createdAt DESC').all();

    const formattedAgreements = agreements.map(agreement => ({
      ...agreement,
      finalRent: Number(agreement.finalRent),
      pdfPath: agreement.pdfPath,
    }));

    res.json({ agreements: formattedAgreements });
  } catch (error) {
    console.error('Get admin agreements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
