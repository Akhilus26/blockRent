import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import db from '../database.js';
import crypto from 'crypto';
import {
  uploadOwnership,
  validateFileMagicBytes,
  getSafeFilePath,
  SECURE_OWNERSHIP_DIR
} from '../utils/fileSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for public property image/video uploads (display media only)
const uploadsDir = join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `property-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Simple auth helper (mock - no JWT)
function getUserIdFromRequest(req) {
  return req.headers['x-user-id'] || null;
}

// POST /api/properties/upload-ownership (Secure ownership document upload)
router.post('/upload-ownership', (req, res) => {
  uploadOwnership.single('ownershipDocument')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error uploading ownership document' });
    }

    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (!user || (user.role !== 'landlord' && user.role !== 'admin')) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Only landlords can upload property ownership documents' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Ownership document file is required (PDF, JPEG, or PNG, max 10MB)' });
      }

      // Validate magic bytes
      const isValid = validateFileMagicBytes(req.file.path);
      if (!isValid) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'Corrupted or unsupported file format. Please upload a genuine PDF, JPEG, or PNG document.'
        });
      }

      res.json({
        message: 'Ownership document uploaded securely',
        ownershipDocument: req.file.filename,
        ownershipDocumentName: req.file.originalname
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Upload ownership document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /api/properties (Public/Tenant listing - strictly approved properties only)
router.get('/', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const user = userId ? db.prepare('SELECT role FROM users WHERE id = ?').get(userId) : null;
    const isAdmin = user && user.role === 'admin';

    const { status, district } = req.query;

    let query = 'SELECT * FROM properties';
    const params = [];
    const conditions = [];

    // Security: Only admins can view non-approved properties through this endpoint
    if (isAdmin) {
      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }
    } else {
      // Public / Tenants can ONLY view approved properties
      conditions.push("status = 'approved'");
    }

    if (district) {
      conditions.push('district = ?');
      params.push(district);
    }

    // Only show available properties (not rented) when browsing
    conditions.push("(availability IS NULL OR availability = 'available')");

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY createdAt DESC';

    const properties = db.prepare(query).all(...params);

    // Format properties and sanitize private document paths
    const formattedProperties = properties.map(prop => {
      let parsedImages = [];
      try {
        parsedImages = JSON.parse(prop.images || '[]');
      } catch (parseError) {
        parsedImages = [];
      }

      const result = {
        id: prop.id,
        title: prop.title,
        description: prop.description,
        rent: Number(prop.rent) || 0,
        location: prop.location,
        images: parsedImages,
        videoUrl: prop.videoUrl,
        youtubeUrl: prop.youtubeUrl,
        landlordId: prop.landlordId,
        landlordName: prop.landlordName,
        status: prop.status,
        bedrooms: prop.bedrooms ? Number(prop.bedrooms) : undefined,
        bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
        area: prop.area ? Number(prop.area) : undefined,
        district: prop.district,
        availability: prop.availability || 'available',
        createdAt: prop.createdAt
      };

      // Only include ownership metadata for admin or the property's landlord
      if (isAdmin || (userId && userId === prop.landlordId)) {
        result.ownershipDocumentName = prop.ownershipDocumentName;
        result.rejectionReason = prop.rejectionReason;
      }

      return result;
    });

    res.json({ properties: formattedProperties });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/properties/:id (Direct property view - protected against unapproved access)
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserIdFromRequest(req);
    const user = userId ? db.prepare('SELECT role FROM users WHERE id = ?').get(userId) : null;
    const isAdmin = user && user.role === 'admin';

    const property = db.prepare(`
      SELECT p.*, u.email as landlordEmail, u.phone as landlordPhone 
      FROM properties p
      LEFT JOIN users u ON p.landlordId = u.id
      WHERE p.id = ?
    `).get(id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Security check: If property is not approved, only the owning landlord or an admin can access it!
    if (property.status !== 'approved') {
      const isOwner = userId && property.landlordId === userId;
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: 'This property is pending verification and is not accessible.'
        });
      }
    }

    let parsedImages = [];
    try {
      parsedImages = JSON.parse(property.images || '[]');
    } catch (parseError) {
      parsedImages = [];
    }

    const formattedProperty = {
      id: property.id,
      title: property.title,
      description: property.description,
      rent: Number(property.rent),
      location: property.location,
      images: parsedImages,
      videoUrl: property.videoUrl,
      youtubeUrl: property.youtubeUrl,
      landlordId: property.landlordId,
      landlordName: property.landlordName,
      landlordEmail: property.landlordEmail,
      landlordPhone: property.landlordPhone,
      status: property.status,
      bedrooms: property.bedrooms ? Number(property.bedrooms) : undefined,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : undefined,
      area: property.area ? Number(property.area) : undefined,
      district: property.district,
      availability: property.availability || 'available',
      createdAt: property.createdAt
    };

    // Include verification details only for owner or admin
    if (isAdmin || (userId && userId === property.landlordId)) {
      formattedProperty.ownershipDocumentName = property.ownershipDocumentName;
      formattedProperty.rejectionReason = property.rejectionReason;
    }

    res.json({ property: formattedProperty });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties (Landlord creates property with mandatory ownership document)
router.post('/', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is landlord or admin
    const user = db.prepare('SELECT role, name FROM users WHERE id = ?').get(userId);
    if (!user || (user.role !== 'landlord' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only landlords can create properties' });
    }

    const {
      title,
      description,
      rent,
      location,
      images = [],
      videoUrl,
      youtubeUrl,
      bedrooms,
      bathrooms,
      area,
      district,
      ownershipDocument,
      ownershipDocumentName
    } = req.body;

    if (!title || !description || !rent || !location) {
      return res.status(400).json({ error: 'Title, description, rent, and location are required' });
    }

    // Security: Require property ownership document for verification
    if (!ownershipDocument) {
      return res.status(400).json({
        error: 'Property ownership document is required for verification before listing.'
      });
    }

    // Verify ownership document exists safely in private storage
    const safeDocPath = getSafeFilePath(SECURE_OWNERSHIP_DIR, ownershipDocument);
    if (!safeDocPath) {
      return res.status(400).json({
        error: 'Invalid or missing ownership document file. Please upload an ownership document.'
      });
    }

    const propertyId = crypto.randomUUID();

    // Default status is 'pending' for admin review
    const insertStmt = db.prepare(`
      INSERT INTO properties (
        id, title, description, rent, location, images, videoUrl, youtubeUrl,
        landlordId, landlordName, status, bedrooms, bathrooms, area, district,
        ownershipDocument, ownershipDocumentName, rejectionReason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    insertStmt.run(
      propertyId,
      title,
      description,
      rent,
      location,
      JSON.stringify(images),
      videoUrl || null,
      youtubeUrl || null,
      userId,
      user.name,
      'pending', // Default to pending verification
      bedrooms || null,
      bathrooms || null,
      area || null,
      district || null,
      ownershipDocument,
      ownershipDocumentName || 'Ownership Document'
    );

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);

    const formattedProperty = {
      ...property,
      images: JSON.parse(property.images || '[]'),
      rent: Number(property.rent),
      bedrooms: property.bedrooms ? Number(property.bedrooms) : undefined,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : undefined,
      area: property.area ? Number(property.area) : undefined,
      district: property.district
    };

    res.status(201).json({
      property: formattedProperty,
      message: 'Property submitted successfully! It will be listed publicly after administrator verification.'
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/properties/landlord/:landlordId
router.get('/landlord/:landlordId', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { landlordId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (landlordId !== userId && (!user || user.role !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized to view these properties' });
    }

    const properties = db.prepare(
      'SELECT * FROM properties WHERE landlordId = ? ORDER BY createdAt DESC'
    ).all(landlordId);

    const formattedProperties = properties.map(prop => ({
      ...prop,
      images: JSON.parse(prop.images || '[]'),
      rent: Number(prop.rent),
      bedrooms: prop.bedrooms ? Number(prop.bedrooms) : undefined,
      bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
      area: prop.area ? Number(prop.area) : undefined,
    }));

    res.json({ properties: formattedProperties });
  } catch (error) {
    console.error('Get landlord properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/properties/:id (Update property; resets verification to pending on re-review if needed)
router.put('/:id', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (property.landlordId !== userId && (!user || user.role !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    const {
      title,
      description,
      rent,
      location,
      images = [],
      videoUrl,
      youtubeUrl,
      bedrooms,
      bathrooms,
      area,
      district,
      ownershipDocument,
      ownershipDocumentName
    } = req.body;

    if (!title || !description || !rent || !location) {
      return res.status(400).json({ error: 'Title, description, rent, and location are required' });
    }

    let finalOwnershipDoc = property.ownershipDocument;
    let finalOwnershipDocName = property.ownershipDocumentName;
    let newStatus = property.status;
    let clearRejection = false;

    // If new ownership document is uploaded
    if (ownershipDocument && ownershipDocument !== property.ownershipDocument) {
      const safePath = getSafeFilePath(SECURE_OWNERSHIP_DIR, ownershipDocument);
      if (!safePath) {
        return res.status(400).json({ error: 'Invalid ownership document uploaded' });
      }
      finalOwnershipDoc = ownershipDocument;
      finalOwnershipDocName = ownershipDocumentName || 'Ownership Document';
      newStatus = 'pending'; // Require re-verification on document change
      clearRejection = true;
    }

    // If the property was rejected, updating it resets status to pending for re-review
    if (property.status === 'rejected') {
      newStatus = 'pending';
      clearRejection = true;
    }

    // Update property
    db.prepare(`
      UPDATE properties 
      SET title = ?, description = ?, rent = ?, location = ?, images = ?,
          videoUrl = ?, youtubeUrl = ?, bedrooms = ?, bathrooms = ?, area = ?, district = ?,
          ownershipDocument = ?, ownershipDocumentName = ?,
          status = ?, rejectionReason = CASE WHEN ? = 1 THEN NULL ELSE rejectionReason END
      WHERE id = ?
    `).run(
      title,
      description,
      rent,
      location,
      JSON.stringify(images),
      videoUrl || null,
      youtubeUrl || null,
      bedrooms || null,
      bathrooms || null,
      area || null,
      district || null,
      finalOwnershipDoc,
      finalOwnershipDocName,
      newStatus,
      clearRejection ? 1 : 0,
      id
    );

    const updatedProperty = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    const formattedProperty = {
      ...updatedProperty,
      images: JSON.parse(updatedProperty.images || '[]'),
      rent: Number(updatedProperty.rent),
      bedrooms: updatedProperty.bedrooms ? Number(updatedProperty.bedrooms) : undefined,
      bathrooms: updatedProperty.bathrooms ? Number(updatedProperty.bathrooms) : undefined,
      area: updatedProperty.area ? Number(updatedProperty.area) : undefined,
      district: updatedProperty.district
    };

    res.json({
      property: formattedProperty,
      message: newStatus === 'pending'
        ? 'Property updated! It is now pending administrator verification.'
        : 'Property updated successfully.'
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/properties/:id/availability
router.patch('/:id/availability', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { availability } = req.body;

    if (!availability || !['available', 'rented'].includes(availability)) {
      return res.status(400).json({ error: 'Valid availability status is required (available or rented)' });
    }

    const property = db.prepare('SELECT landlordId FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (property.landlordId !== userId && (!user || user.role !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    db.prepare('UPDATE properties SET availability = ? WHERE id = ?').run(availability, id);

    const updatedProperty = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    const formattedProperty = {
      ...updatedProperty,
      images: JSON.parse(updatedProperty.images || '[]'),
      rent: Number(updatedProperty.rent),
      bedrooms: updatedProperty.bedrooms ? Number(updatedProperty.bedrooms) : undefined,
      bathrooms: updatedProperty.bathrooms ? Number(updatedProperty.bathrooms) : undefined,
      area: updatedProperty.area ? Number(updatedProperty.area) : undefined,
      availability: updatedProperty.availability || 'available',
    };

    res.json({ property: formattedProperty });
  } catch (error) {
    console.error('Update property availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const property = db.prepare('SELECT landlordId, images, ownershipDocument FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (property.landlordId !== userId && (!user || user.role !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized to delete this property' });
    }

    // Delete associated image files
    try {
      const images = JSON.parse(property.images || '[]');
      images.forEach((imagePath) => {
        if (imagePath && imagePath.startsWith('/uploads/')) {
          const filePath = join(__dirname, '..', imagePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    } catch (err) {
      console.error('Error deleting image files:', err);
    }

    // Delete secure ownership document
    if (property.ownershipDocument) {
      const docPath = getSafeFilePath(SECURE_OWNERSHIP_DIR, property.ownershipDocument);
      if (docPath && fs.existsSync(docPath)) {
        try {
          fs.unlinkSync(docPath);
        } catch (err) {
          console.error('Error deleting ownership doc:', err);
        }
      }
    }

    db.prepare('DELETE FROM properties WHERE id = ?').run(id);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties/upload (For property listing images/videos)
router.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const fileUrls = req.files.map(file => `/uploads/${file.filename}`);

    res.json({
      message: 'Files uploaded successfully',
      files: fileUrls
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
