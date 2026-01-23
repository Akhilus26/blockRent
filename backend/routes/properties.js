import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import db from '../database.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
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

// GET /api/properties
router.get('/', (req, res) => {
  try {
    const { status, district } = req.query;

    let query = 'SELECT * FROM properties';
    const params = [];

    const conditions = [];
    if (status) {
      conditions.push('status = ?');
      params.push(status);
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

    console.log('Fetching properties from database...');
    console.log('Query:', query);
    console.log('Params:', params);

    const properties = db.prepare(query).all(...params);

    console.log(`Found ${properties.length} properties in database`);

    // Parse images JSON
    const formattedProperties = properties.map(prop => {
      try {
        return {
          ...prop,
          images: JSON.parse(prop.images || '[]'),
          rent: Number(prop.rent),
          bedrooms: prop.bedrooms ? Number(prop.bedrooms) : undefined,
          bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
          area: prop.area ? Number(prop.area) : undefined,
          district: prop.district,
          availability: prop.availability || 'available',
        };
      } catch (parseError) {
        console.error(`Error parsing property ${prop.id}:`, parseError);
        return {
          ...prop,
          images: [],
          rent: Number(prop.rent) || 0,
          bedrooms: prop.bedrooms ? Number(prop.bedrooms) : undefined,
          bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
          area: prop.area ? Number(prop.area) : undefined,
          district: prop.district,
          availability: prop.availability || 'available',
        };
      }
    });

    console.log(`Returning ${formattedProperties.length} formatted properties`);
    res.json({ properties: formattedProperties });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/properties/:id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const property = db.prepare(`
      SELECT p.*, u.email as landlordEmail, u.phone as landlordPhone 
      FROM properties p
      LEFT JOIN users u ON p.landlordId = u.id
      WHERE p.id = ?
    `).get(id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Parse images JSON
    const formattedProperty = {
      ...property,
      images: JSON.parse(property.images || '[]'),
      rent: Number(property.rent),
      bedrooms: property.bedrooms ? Number(property.bedrooms) : undefined,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : undefined,
      area: property.area ? Number(property.area) : undefined,
      availability: property.availability || 'available',
    };

    res.json({ property: formattedProperty });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties
router.post('/', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is landlord or admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
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
      district
    } = req.body;

    if (!title || !description || !rent || !location) {
      return res.status(400).json({ error: 'Title, description, rent, and location are required' });
    }

    // Get landlord info
    const landlord = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    const propertyId = crypto.randomUUID();

    // Insert property with all fields
    const insertStmt = db.prepare(`
      INSERT INTO properties (
        id, title, description, rent, location, images, videoUrl, youtubeUrl,
        landlordId, landlordName, status, bedrooms, bathrooms, area, district
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      landlord.name,
      'approved', // Set to 'approved' so properties show immediately
      bedrooms || null,
      bathrooms || null,
      area || null,
      district || null
    );

    // Verify the property was saved correctly
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);

    if (!property) {
      console.error('Property was not saved to database');
      return res.status(500).json({ error: 'Failed to save property to database' });
    }

    console.log('Property saved successfully:', {
      id: propertyId,
      title: property.title,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      imagesCount: images.length
    });
    const formattedProperty = {
      ...property,
      images: JSON.parse(property.images || '[]'),
      rent: Number(property.rent),
      bedrooms: property.bedrooms ? Number(property.bedrooms) : undefined,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : undefined,
      area: property.area ? Number(property.area) : undefined,
      district: property.district
    };

    res.status(201).json({ property: formattedProperty });
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

    // Check if user is the landlord or admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (landlordId !== userId && (!user || user.role !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized to view these properties' });
    }

    const properties = db.prepare(
      'SELECT * FROM properties WHERE landlordId = ? ORDER BY createdAt DESC'
    ).all(landlordId);

    // Parse images JSON
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

// PUT /api/properties/:id
router.put('/:id', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Check if property exists and user owns it or is admin
    const property = db.prepare('SELECT landlordId FROM properties WHERE id = ?').get(id);
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
      district
    } = req.body;

    if (!title || !description || !rent || !location) {
      return res.status(400).json({ error: 'Title, description, rent, and location are required' });
    }

    // Update property
    db.prepare(`
      UPDATE properties 
      SET title = ?, description = ?, rent = ?, location = ?, images = ?,
          videoUrl = ?, youtubeUrl = ?, bedrooms = ?, bathrooms = ?, area = ?, district = ?
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

    res.json({ property: formattedProperty });
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

    // Check if property exists and user owns it or is admin
    const property = db.prepare('SELECT landlordId FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (property.landlordId !== userId && (!user || user.role !== 'admin')) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    // Update availability
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

    // Check if property exists and user owns it or is admin
    const property = db.prepare('SELECT landlordId, images FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (property.landlordId !== userId && user.role !== 'admin') {
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

    db.prepare('DELETE FROM properties WHERE id = ?').run(id);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties/upload
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

// GET /api/properties/debug/count - Debug endpoint to check database connection
router.get('/debug/count', (req, res) => {
  try {
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM properties').get();
    const approvedCount = db.prepare('SELECT COUNT(*) as count FROM properties WHERE status = ?').get('approved');
    const pendingCount = db.prepare('SELECT COUNT(*) as count FROM properties WHERE status = ?').get('pending');

    res.json({
      success: true,
      counts: {
        total: totalCount.count,
        approved: approvedCount.count,
        pending: pendingCount.count
      },
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      details: error.message
    });
  }
});

export default router;
