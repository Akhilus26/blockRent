import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../database.js';
import {
  getSafeFilePath,
  SECURE_IDENTITY_DIR,
  SECURE_OWNERSHIP_DIR
} from '../utils/fileSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Simple auth helper (mock - no JWT)
function getUserIdFromRequest(req) {
  return req.headers['x-user-id'] || null;
}

// GET /api/admin/documents/identity/:userId (Secure identity document serving)
router.get('/documents/identity/:userId', (req, res) => {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userId: targetUserId } = req.params;
    const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(requesterId);
    if (!requester) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Authorization: Only admin OR the tenant themselves can view their identity document
    const isSelf = requester.id === targetUserId;
    const isAdmin = requester.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view this identity document' });
    }

    const targetUser = db.prepare('SELECT identityDocument, identityDocumentName FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser || !targetUser.identityDocument) {
      return res.status(404).json({ error: 'Identity document not found' });
    }

    // Traversal-safe file path resolution
    const safePath = getSafeFilePath(SECURE_IDENTITY_DIR, targetUser.identityDocument);
    if (!safePath) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.sendFile(safePath);
  } catch (error) {
    console.error('Serve identity doc error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/documents/ownership/:propertyId (Secure property ownership document serving)
router.get('/documents/ownership/:propertyId', (req, res) => {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { propertyId } = req.params;
    const requester = db.prepare('SELECT id, role FROM users WHERE id = ?').get(requesterId);
    if (!requester) {
      return res.status(401).json({ error: 'User not found' });
    }

    const property = db.prepare('SELECT landlordId, ownershipDocument, ownershipDocumentName FROM properties WHERE id = ?').get(propertyId);
    if (!property || !property.ownershipDocument) {
      return res.status(404).json({ error: 'Ownership document not found' });
    }

    // Authorization: Only admin OR the property owner landlord can view the ownership document
    const isOwner = property.landlordId === requester.id;
    const isAdmin = requester.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view this ownership document' });
    }

    // Traversal-safe file path resolution
    const safePath = getSafeFilePath(SECURE_OWNERSHIP_DIR, property.ownershipDocument);
    if (!safePath) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.sendFile(safePath);
  } catch (error) {
    console.error('Serve ownership doc error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    const { includeDeleted } = req.query;
    let query = 'SELECT * FROM users';
    if (includeDeleted !== 'true') {
      query += ' WHERE (isDeleted IS NULL OR isDeleted = 0)';
    }
    query += ' ORDER BY createdAt DESC';

    const users = db.prepare(query).all();

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

// PATCH /api/admin/users/:id/approve (Admin approves tenant identity)
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

    // Update user status and verificationStatus
    db.prepare(`
      UPDATE users 
      SET status = 'approved', verificationStatus = 'verified', rejectionReason = NULL 
      WHERE id = ?
    `).run(id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, message: 'Tenant identity approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id/reject (Admin rejects tenant identity with reason)
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
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }

    // Update user status
    db.prepare(`
      UPDATE users 
      SET status = 'rejected', verificationStatus = 'rejected', rejectionReason = ? 
      WHERE id = ?
    `).run(rejectionReason.trim(), id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, message: 'Tenant identity rejected' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/properties (Admin review list)
router.get('/properties', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, includeDeleted } = req.query;
    let query = `
      SELECT p.*, u.email as landlordEmail, u.phone as landlordPhone 
      FROM properties p
      LEFT JOIN users u ON p.landlordId = u.id
    `;
    const conditions = [];
    const params = [];

    if (includeDeleted !== 'true') {
      conditions.push('(p.isDeleted IS NULL OR p.isDeleted = 0)');
    }
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.createdAt DESC';

    const properties = db.prepare(query).all(...params);

    const formatted = properties.map(prop => ({
      ...prop,
      images: JSON.parse(prop.images || '[]'),
      rent: Number(prop.rent) || 0,
      bedrooms: prop.bedrooms ? Number(prop.bedrooms) : undefined,
      bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
      area: prop.area ? Number(prop.area) : undefined,
    }));

    res.json({ properties: formatted });
  } catch (error) {
    console.error('Get admin properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/properties/:id/approve (Admin approves property)
router.patch('/properties/:id/approve', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    db.prepare(`
      UPDATE properties 
      SET status = 'approved', rejectionReason = NULL 
      WHERE id = ?
    `).run(id);

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ property, message: 'Property ownership approved successfully' });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/properties/:id/reject (Admin rejects property with reason)
router.patch('/properties/:id/reject', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }

    db.prepare(`
      UPDATE properties 
      SET status = 'rejected', rejectionReason = ? 
      WHERE id = ?
    `).run(rejectionReason.trim(), id);

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ property, message: 'Property rejected' });
  } catch (error) {
    console.error('Reject property error:', error);
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

    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE (isDeleted IS NULL OR isDeleted = 0)').get().count;
    const pendingTenants = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'tenant' AND verificationStatus = 'pending' AND (isDeleted IS NULL OR isDeleted = 0)").get().count;
    const verifiedTenants = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'tenant' AND verificationStatus = 'verified' AND (isDeleted IS NULL OR isDeleted = 0)").get().count;
    const totalProperties = db.prepare('SELECT COUNT(*) as count FROM properties WHERE (isDeleted IS NULL OR isDeleted = 0)').get().count;
    const pendingProperties = db.prepare("SELECT COUNT(*) as count FROM properties WHERE status = 'pending' AND (isDeleted IS NULL OR isDeleted = 0)").get().count;
    const approvedProperties = db.prepare("SELECT COUNT(*) as count FROM properties WHERE status = 'approved' AND (isDeleted IS NULL OR isDeleted = 0)").get().count;
    const totalAgreements = db.prepare('SELECT COUNT(*) as count FROM agreements').get().count;
    const rentedProperties = db.prepare("SELECT COUNT(*) as count FROM properties WHERE availability = 'rented' AND (isDeleted IS NULL OR isDeleted = 0)").get().count;

    res.json({
      stats: {
        totalUsers: Number(totalUsers),
        pendingUsers: Number(pendingTenants), // backward compat
        pendingTenants: Number(pendingTenants),
        verifiedTenants: Number(verifiedTenants),
        totalProperties: Number(totalProperties),
        pendingProperties: Number(pendingProperties),
        approvedProperties: Number(approvedProperties),
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

    const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    if (userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check related records referencing this user
    const directAgreements = db.prepare(
      'SELECT COUNT(*) as count FROM agreements WHERE tenantId = ? OR landlordId = ?'
    ).get(id, id).count;

    const directRequests = db.prepare(
      'SELECT COUNT(*) as count FROM rental_requests WHERE tenantId = ? OR landlordId = ?'
    ).get(id, id).count;

    const landlordProperties = db.prepare(
      'SELECT id, images, ownershipDocument FROM properties WHERE landlordId = ?'
    ).all(id);

    let propRequestsCount = 0;
    let propAgreementsCount = 0;
    if (landlordProperties.length > 0) {
      propRequestsCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM rental_requests r
        JOIN properties p ON r.propertyId = p.id
        WHERE p.landlordId = ?
      `).get(id).count;

      propAgreementsCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM agreements a
        JOIN properties p ON a.propertyId = p.id
        WHERE p.landlordId = ?
      `).get(id).count;
    }

    const totalRelations = directAgreements + directRequests + propRequestsCount + propAgreementsCount;

    // If caller explicitly requested permanent deletion but related records exist, return clear 409
    if (req.query.permanent === 'true' && totalRelations > 0) {
      return res.status(409).json({
        error: 'Cannot permanently delete user because related rental agreements, requests, or property transaction history exist. User account can only be deactivated to preserve legal and blockchain audit records.',
        hasRelatedRecords: true,
        counts: {
          agreements: directAgreements + propAgreementsCount,
          requests: directRequests + propRequestsCount,
          properties: landlordProperties.length
        }
      });
    }

    // Case A: Safe for permanent deletion (no rental requests or agreements exist anywhere)
    if (totalRelations === 0) {
      // If landlord had properties without any rental history, safely remove files and delete them
      if (landlordProperties.length > 0) {
        for (const prop of landlordProperties) {
          try {
            const images = JSON.parse(prop.images || '[]');
            images.forEach((img) => {
              if (img && img.startsWith('/uploads/')) {
                const imgPath = join(__dirname, '..', img);
                if (fs.existsSync(imgPath)) {
                  try { fs.unlinkSync(imgPath); } catch (e) {}
                }
              }
            });
          } catch (e) {}

          if (prop.ownershipDocument) {
            const docPath = getSafeFilePath(SECURE_OWNERSHIP_DIR, prop.ownershipDocument);
            if (docPath && fs.existsSync(docPath)) {
              try { fs.unlinkSync(docPath); } catch (e) {}
            }
          }
        }
        db.prepare('DELETE FROM properties WHERE landlordId = ?').run(id);
      }

      // Delete secure identity file if exists
      if (user.identityDocument) {
        const docPath = getSafeFilePath(SECURE_IDENTITY_DIR, user.identityDocument);
        if (docPath && fs.existsSync(docPath)) {
          try { fs.unlinkSync(docPath); } catch (e) {}
        }
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(id);

      return res.json({ 
        message: 'User permanently deleted successfully',
        permanent: true 
      });
    }

    // Case B: Has related records - perform safe soft deletion / deactivation to preserve blockchain and legal records
    db.prepare(`
      UPDATE users 
      SET isDeleted = 1,
          isActive = 0,
          deletedAt = datetime('now')
      WHERE id = ?
    `).run(id);

    // If landlord, deactivate all their listings so they vanish from search and listings
    if (landlordProperties.length > 0) {
      db.prepare(`
        UPDATE properties 
        SET isDeleted = 1,
            isActive = 0,
            availability = 'unavailable',
            deletedAt = datetime('now')
        WHERE landlordId = ?
      `).run(id);
    }

    return res.json({
      message: 'User has associated rental history. The account has been safely deactivated to preserve agreement and blockchain records.',
      softDeleted: true,
      deactivated: true
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/admin/agreements
router.get('/agreements', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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
