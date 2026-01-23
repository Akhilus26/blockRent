import express from 'express';
import db from '../database.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, createWriteStream } from 'fs';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '..', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Simple auth helper (mock - no JWT)
function getUserIdFromRequest(req) {
  return req.headers['x-user-id'] || null;
}

// Generate blockchain hash (simple SHA-256)
function generateBlockchainHash(agreementData) {
  const dataString = JSON.stringify(agreementData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Generate PDF agreement
function generateAgreementPDF(agreement) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const filename = `agreement_${agreement.id}.pdf`;
    const filepath = join(uploadsDir, filename);

    const stream = createWriteStream(filepath);
    doc.pipe(stream);

    // PDF content
    doc.fontSize(20).text('Rental Agreement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Agreement ID: ${agreement.id}`);
    doc.text(`Property: ${agreement.propertyTitle}`);
    doc.text(`Tenant: ${agreement.tenantName}`);
    doc.text(`Landlord: ${agreement.landlordName}`);
    doc.moveDown();
    doc.text(`Monthly Rent: ₹${agreement.finalRent.toLocaleString()}`);
    doc.text(`Start Date: ${new Date(agreement.startDate).toLocaleDateString()}`);
    doc.text(`End Date: ${new Date(agreement.endDate).toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Blockchain Hash: ${agreement.blockchainHash}`);
    doc.text(`Timestamp: ${new Date(agreement.blockchainTimestamp).toLocaleString()}`);
    doc.moveDown();
    doc.text('This agreement has been finalized and stored on the blockchain.');
    doc.text('The hash above serves as proof of the agreement\'s integrity.');

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

// POST /api/agreements/finalize
router.post('/finalize', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { requestId, startDate, endDate } = req.body;

    if (!requestId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Request ID, start date, and end date are required' });
    }

    // Get request
    const request = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if request is accepted
    if (request.status !== 'accepted') {
      return res.status(400).json({ error: 'Request must be accepted before finalizing' });
    }

    // Check if user is tenant or landlord
    const user = db.prepare('SELECT role, name FROM users WHERE id = ?').get(userId);
    if (!user || (user.role !== 'tenant' && user.role !== 'landlord')) {
      return res.status(403).json({ error: 'Only tenant or landlord can finalize agreements' });
    }

    // Get landlord info
    const landlord = db.prepare('SELECT name FROM users WHERE id = ?').get(request.landlordId);
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    // Check if agreement already exists
    const existingAgreement = db.prepare(
      'SELECT id FROM agreements WHERE requestId = ?'
    ).get(requestId);

    if (existingAgreement) {
      return res.status(400).json({ error: 'Agreement already exists for this request' });
    }

    const agreementId = crypto.randomUUID();
    const finalRent = request.proposedRent;
    const blockchainTimestamp = new Date().toISOString();

    // Create agreement data for hash
    const agreementData = {
      id: agreementId,
      propertyId: request.propertyId,
      tenantId: request.tenantId,
      landlordId: request.landlordId,
      finalRent,
      startDate,
      endDate,
      timestamp: blockchainTimestamp,
    };

    const blockchainHash = generateBlockchainHash(agreementData);

    // Generate PDF
    const agreement = {
      id: agreementId,
      propertyId: request.propertyId,
      propertyTitle: request.propertyTitle,
      tenantId: request.tenantId,
      tenantName: request.tenantName,
      landlordId: request.landlordId,
      landlordName: landlord.name,
      finalRent,
      startDate,
      endDate,
      blockchainHash,
      blockchainTimestamp,
    };

    let pdfFilename = null;
    try {
      pdfFilename = await generateAgreementPDF(agreement);
    } catch (error) {
      console.error('PDF generation error:', error);
      // Continue even if PDF generation fails
    }

    // Insert agreement
    db.prepare(`
      INSERT INTO agreements (
        id, propertyId, propertyTitle, tenantId, tenantName, landlordId, landlordName,
        requestId, finalRent, startDate, endDate, blockchainHash, blockchainTimestamp, pdfPath
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agreementId,
      request.propertyId,
      request.propertyTitle,
      request.tenantId,
      request.tenantName,
      request.landlordId,
      landlord.name,
      requestId,
      finalRent,
      startDate,
      endDate,
      blockchainHash,
      blockchainTimestamp,
      pdfFilename
    );

    // Update request status
    db.prepare('UPDATE rental_requests SET status = ? WHERE id = ?').run('finalized', requestId);

    const createdAgreement = db.prepare('SELECT * FROM agreements WHERE id = ?').get(agreementId);
    const formattedAgreement = {
      ...createdAgreement,
      finalRent: Number(createdAgreement.finalRent),
      finalRent: Number(createdAgreement.finalRent),
      pdfPath: createdAgreement.pdfPath,
    };

    res.status(201).json({ agreement: formattedAgreement });
  } catch (error) {
    console.error('Finalize agreement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agreements/user (for tenants)
router.get('/user', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const agreements = db.prepare(
      'SELECT * FROM agreements WHERE tenantId = ? ORDER BY createdAt DESC'
    ).all(userId);

    const formattedAgreements = agreements.map(agreement => ({
      ...agreement,
      finalRent: Number(agreement.finalRent),
      pdfPath: agreement.pdfPath,
    }));

    res.json({ agreements: formattedAgreements });
  } catch (error) {
    console.error('Get user agreements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agreements/landlord
router.get('/landlord', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const agreements = db.prepare(
      'SELECT * FROM agreements WHERE landlordId = ? ORDER BY createdAt DESC'
    ).all(userId);

    const formattedAgreements = agreements.map(agreement => ({
      ...agreement,
      finalRent: Number(agreement.finalRent),
      pdfPath: agreement.pdfPath,
    }));

    res.json({ agreements: formattedAgreements });
  } catch (error) {
    console.error('Get landlord agreements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agreements/:id/hash
router.get('/:id/hash', (req, res) => {
  try {
    const { id } = req.params;
    const agreement = db.prepare('SELECT blockchainHash, blockchainTimestamp FROM agreements WHERE id = ?').get(id);

    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    res.json({
      hash: agreement.blockchainHash,
      timestamp: agreement.blockchainTimestamp,
    });
  } catch (error) {
    console.error('Get agreement hash error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
