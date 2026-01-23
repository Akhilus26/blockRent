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

// Generate blockchain hash for agreement
function generateBlockchainHashForAgreement(agreementData) {
  const dataString = JSON.stringify(agreementData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Generate PDF for agreement
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

// Generate blockchain hash (simple SHA-256)
function generateBlockchainHash(requestData) {
  const dataString = JSON.stringify(requestData);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Generate PDF for accepted request
function generateRequestPDF(request, landlord) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const filename = `request_${request.id}.pdf`;
    const filepath = join(uploadsDir, filename);

    const stream = createWriteStream(filepath);
    doc.pipe(stream);

    // PDF content
    doc.fontSize(20).text('Rental Request Agreement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Request ID: ${request.id}`);
    doc.text(`Property: ${request.propertyTitle}`);
    doc.text(`Tenant: ${request.tenantName}`);
    doc.text(`Landlord: ${landlord.name}`);
    doc.moveDown();
    doc.text(`Monthly Rent: ₹${request.finalRent.toLocaleString()}`);
    doc.text(`Original Rent: ₹${request.originalRent.toLocaleString()}`);
    doc.text(`Proposed Rent: ₹${request.proposedRent.toLocaleString()}`);
    doc.moveDown();
    if (request.message) {
      doc.text(`Message: ${request.message}`);
      doc.moveDown();
    }
    doc.text(`Status: ${request.status.toUpperCase()}`);
    doc.text(`Created At: ${new Date(request.createdAt).toLocaleString()}`);
    doc.moveDown();
    if (request.blockchainHash) {
      doc.text(`Blockchain Hash: ${request.blockchainHash}`);
      doc.text(`Blockchain Timestamp: ${new Date(request.blockchainTimestamp).toLocaleString()}`);
      doc.moveDown();
      doc.text('This request has been accepted and stored on the blockchain.');
      doc.text('The hash above serves as proof of the request\'s integrity.');
    }

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

// Simple auth helper (mock - no JWT)
function getUserIdFromRequest(req) {
  return req.headers['x-user-id'] || null;
}

// POST /api/requests
router.post('/', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is tenant
    const user = db.prepare('SELECT role, name FROM users WHERE id = ?').get(userId);
    if (!user || user.role !== 'tenant') {
      return res.status(403).json({ error: 'Only tenants can create rental requests' });
    }

    const { propertyId, proposedRent, message } = req.body;

    if (!propertyId || !proposedRent) {
      return res.status(400).json({ error: 'Property ID and proposed rent are required' });
    }

    // Get property info
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if property is available
    if (property.availability && property.availability !== 'available') {
      return res.status(400).json({ error: 'This property is currently not available for new requests (pending payment or rented)' });
    }

    // Check if request already exists
    const existingRequest = db.prepare(
      'SELECT id FROM rental_requests WHERE propertyId = ? AND tenantId = ? AND status IN (\'pending\', \'countered\')'
    ).get(propertyId, userId);

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have an active request for this property' });
    }

    const requestId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO rental_requests (
        id, propertyId, propertyTitle, tenantId, tenantName, landlordId,
        status, proposedRent, originalRent, message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      propertyId,
      property.title,
      userId,
      user.name,
      property.landlordId,
      'pending',
      proposedRent,
      property.rent,
      message || null
    );

    const request = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(500).json({ error: 'Failed to retrieve created request' });
    }

    const formattedRequest = {
      ...request,
      proposedRent: Number(request.proposedRent),
      originalRent: Number(request.originalRent),
      counterRent: (request.counterRent !== null && request.counterRent !== undefined) ? Number(request.counterRent) : null,
      finalRent: (request.finalRent !== null && request.finalRent !== undefined) ? Number(request.finalRent) : null,
      finalRent: (request.finalRent !== null && request.finalRent !== undefined) ? Number(request.finalRent) : null,
      pdfPath: request.pdfPath,
      blockchainHash: request.blockchainHash || null,
      blockchainTimestamp: request.blockchainTimestamp || null,
    };

    res.status(201).json({ request: formattedRequest });
  } catch (error) {
    console.error('Create request error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/requests/user (for tenants)
router.get('/user', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requests = db.prepare(
      'SELECT * FROM rental_requests WHERE tenantId = ? ORDER BY createdAt DESC'
    ).all(userId);

    const formattedRequests = requests.map(req => ({
      ...req,
      proposedRent: Number(req.proposedRent),
      originalRent: Number(req.originalRent),
      counterRent: req.counterRent ? Number(req.counterRent) : null,
      finalRent: req.finalRent ? Number(req.finalRent) : null,
      pdfPath: req.pdfPath || null,
      blockchainHash: req.blockchainHash || null,
      blockchainTimestamp: req.blockchainTimestamp || null,
    }));

    res.json({ requests: formattedRequests });
  } catch (error) {
    console.error('Get user requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/requests/landlord
router.get('/landlord', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requests = db.prepare(
      'SELECT * FROM rental_requests WHERE landlordId = ? ORDER BY createdAt DESC'
    ).all(userId);

    const formattedRequests = requests.map(req => ({
      ...req,
      proposedRent: Number(req.proposedRent),
      originalRent: Number(req.originalRent),
      counterRent: req.counterRent ? Number(req.counterRent) : null,
      finalRent: req.finalRent ? Number(req.finalRent) : null,
      pdfPath: req.pdfPath || null,
      blockchainHash: req.blockchainHash || null,
      blockchainTimestamp: req.blockchainTimestamp || null,
    }));

    res.json({ requests: formattedRequests });
  } catch (error) {
    console.error('Get landlord requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/requests/:id/respond (Landlord responds: accept, reject, or counter-offer)
router.patch('/:id/respond', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { action, counterRent, message } = req.body;

    if (!action || !['accept', 'reject', 'counter'].includes(action)) {
      return res.status(400).json({ error: 'Valid action is required (accept, reject, counter)' });
    }

    // Get request
    const request = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is the landlord
    if (request.landlordId !== userId) {
      return res.status(403).json({ error: 'Only the landlord can respond to requests' });
    }

    // Check if request is in valid state
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not in pending state' });
    }

    // Get landlord info
    const landlord = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    let newStatus;
    let finalRent = null;
    let counterRentValue = null;
    let blockchainHash = null;
    let blockchainTimestamp = null;
    let pdfFilename = null;

    if (action === 'accept') {
      newStatus = 'approved';
      finalRent = request.proposedRent;

      // Set approval properties
      blockchainTimestamp = new Date().toISOString();

      // For 'approved' status, we just mark it approved and await payment
      // Agreement will be created after payment
      try {
        // Set advance amount (1 month rent)
        db.prepare('UPDATE rental_requests SET advanceAmount = ?, approvalTimestamp = ? WHERE id = ?')
          .run(finalRent, blockchainTimestamp, id);

        // LOCK PROPERTY: Set availability to 'pending_payment'
        db.prepare("UPDATE properties SET availability = 'pending_payment' WHERE id = ?").run(request.propertyId);

        // CANCEL OTHERS: Reject all other pending/countered requests for this property
        db.prepare(`
          UPDATE rental_requests 
          SET status = 'rejected', message = 'The landlord has accepted another request for this property.'
          WHERE propertyId = ? AND id != ? AND status IN ('pending', 'countered')
        `).run(request.propertyId, id);

        console.log(`Property ${request.propertyId} locked. Other requests cancelled.`);
      } catch (error) {
        console.error('Error updating approval details:', error);
      }

    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'counter') {
      if (!counterRent || counterRent <= 0) {
        return res.status(400).json({ error: 'Counter rent is required for counter-offer' });
      }

      // Validate counter rent is between proposed and original
      const minRent = Math.min(request.proposedRent, request.originalRent);
      const maxRent = Math.max(request.proposedRent, request.originalRent);

      if (counterRent < minRent || counterRent > maxRent) {
        return res.status(400).json({
          error: `Counter rent must be between ₹${minRent.toLocaleString()} and ₹${maxRent.toLocaleString()}`
        });
      }

      newStatus = 'countered';
      counterRentValue = counterRent;
    }

    // Update request
    db.prepare(`
      UPDATE rental_requests 
      SET status = ?, counterRent = ?, finalRent = ?, message = ?, blockchainHash = ?, blockchainTimestamp = ?, pdfPath = ?
      WHERE id = ?
    `).run(
      newStatus,
      counterRentValue,
      finalRent,
      message || null,
      blockchainHash,
      blockchainTimestamp,
      pdfFilename ? `/uploads/${pdfFilename}` : null,
      id
    );

    const updatedRequest = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id);
    const formattedRequest = {
      ...updatedRequest,
      proposedRent: Number(updatedRequest.proposedRent),
      originalRent: Number(updatedRequest.originalRent),
      counterRent: updatedRequest.counterRent ? Number(updatedRequest.counterRent) : null,
      finalRent: updatedRequest.finalRent ? Number(updatedRequest.finalRent) : null,
      pdfPath: updatedRequest.pdfPath || null,
      blockchainHash: updatedRequest.blockchainHash || null,
      blockchainTimestamp: updatedRequest.blockchainTimestamp || null,
    };

    res.json({ request: formattedRequest });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/requests/:id/confirm (Tenant responds to counter-offer)
router.patch('/:id/confirm', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { action } = req.body;

    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Valid action is required (accept, reject)' });
    }

    // Get request
    const request = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is the tenant
    if (request.tenantId !== userId) {
      return res.status(403).json({ error: 'Only the tenant can confirm counter-offers' });
    }

    // Check if request is in countered state
    if (request.status !== 'countered') {
      return res.status(400).json({ error: 'Request is not in countered state' });
    }

    // Get landlord info for PDF/Agreement
    const landlord = db.prepare('SELECT name FROM users WHERE id = ?').get(request.landlordId);
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    let newStatus;
    let finalRent = null;
    let blockchainHash = null;
    let blockchainTimestamp = null;
    let pdfFilename = null;

    if (action === 'accept') {
      newStatus = 'approved';
      finalRent = request.counterRent || request.proposedRent;

      // Set approval properties for timer
      blockchainTimestamp = new Date().toISOString();

      // For 'approved' status, we just mark it approved and await payment
      // Agreement will be created after payment
      try {
        // Set advance amount (1 month rent)
        db.prepare('UPDATE rental_requests SET advanceAmount = ?, approvalTimestamp = ? WHERE id = ?')
          .run(finalRent, blockchainTimestamp, id);

        // LOCK PROPERTY: Set availability to 'pending_payment'
        db.prepare("UPDATE properties SET availability = 'pending_payment' WHERE id = ?").run(request.propertyId);

        // CANCEL OTHERS: Reject all other pending/countered requests for this property
        db.prepare(`
          UPDATE rental_requests 
          SET status = 'rejected', message = 'The landlord has accepted another request for this property.'
          WHERE propertyId = ? AND id != ? AND status IN ('pending', 'countered')
        `).run(request.propertyId, id);

        console.log(`Property ${request.propertyId} locked. Other requests cancelled.`);
      } catch (error) {
        console.error('Error updating approval details:', error);
      }

    } else {
      newStatus = 'rejected';
    }

    // Update request
    db.prepare(`
      UPDATE rental_requests 
      SET status = ?, finalRent = ?, blockchainHash = ?, blockchainTimestamp = ?, pdfPath = ?
      WHERE id = ?
    `).run(
      newStatus,
      finalRent,
      blockchainHash,
      blockchainTimestamp,
      pdfFilename ? `/uploads/${pdfFilename}` : null,
      id
    );

    const updatedRequest = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id);
    const formattedRequest = {
      ...updatedRequest,
      proposedRent: Number(updatedRequest.proposedRent),
      originalRent: Number(updatedRequest.originalRent),
      counterRent: updatedRequest.counterRent ? Number(updatedRequest.counterRent) : null,
      finalRent: updatedRequest.finalRent ? Number(updatedRequest.finalRent) : null,
      pdfPath: updatedRequest.pdfPath || null,
      blockchainHash: updatedRequest.blockchainHash || null,
      blockchainTimestamp: updatedRequest.blockchainTimestamp || null,
    };

    res.json({ request: formattedRequest });
  } catch (error) {
    console.error('Confirm request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/requests/:id/pay
router.post('/:id/pay', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Get request
    const request = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is the tenant
    if (request.tenantId !== userId) {
      return res.status(403).json({ error: 'Only the tenant can make payments' });
    }

    // Check status
    if (request.status !== 'approved') {
      return res.status(400).json({ error: 'Request is not approved for payment' });
    }

    // Check Timer (2 days = 2880 minutes)
    const approvalTime = new Date(request.approvalTimestamp).getTime();
    const currentTime = new Date().getTime();
    const timeDiffMinutes = (currentTime - approvalTime) / (1000 * 60);

    if (timeDiffMinutes > 2880) {
      // Expired
      db.prepare('UPDATE rental_requests SET status = ? WHERE id = ?').run('rejected', id);
      return res.status(400).json({ error: 'Payment time expired. Request cancelled.' });
    }

    // Process Mock Payment
    const paymentStatus = 'completed';
    const finalRent = request.finalRent || request.proposedRent; // Should be set during approval

    // Get landlord info
    const landlord = db.prepare('SELECT name FROM users WHERE id = ?').get(request.landlordId);

    // --- Agreement Generation Logic ---
    const blockchainTimestamp = new Date().toISOString();
    let blockchainHash = null;
    let pdfFilename = null;
    let agreementPdfFilename = null;

    // Create blockchain hash for Request
    const requestData = {
      id: request.id,
      propertyId: request.propertyId,
      tenantId: request.tenantId,
      landlordId: request.landlordId,
      finalRent,
      status: 'rented', // Final status
      timestamp: blockchainTimestamp,
      paymentStatus: 'completed'
    };
    blockchainHash = generateBlockchainHash(requestData);

    // Generate Request PDF
    try {
      const requestWithBlockchain = {
        ...request,
        status: 'rented',
        finalRent,
        blockchainHash,
        blockchainTimestamp,
      };
      pdfFilename = await generateRequestPDF(requestWithBlockchain, landlord);
    } catch (error) {
      console.error('PDF generation error:', error);
    }

    // Create Agreement
    try {
      const agreementId = crypto.randomUUID();
      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      const endDateISO = endDate.toISOString();

      // Agreement Hash
      const agreementData = {
        id: agreementId,
        propertyId: request.propertyId,
        tenantId: request.tenantId,
        landlordId: request.landlordId,
        finalRent,
        startDate,
        endDate: endDateISO,
        timestamp: blockchainTimestamp,
      };
      const agreementBlockchainHash = generateBlockchainHashForAgreement(agreementData);

      // Agreement PDF
      try {
        const agreementForPDF = {
          id: agreementId,
          propertyId: request.propertyId,
          propertyTitle: request.propertyTitle,
          tenantId: request.tenantId,
          tenantName: request.tenantName,
          landlordId: request.landlordId,
          landlordName: landlord.name,
          finalRent,
          startDate,
          endDate: endDateISO,
          blockchainHash: agreementBlockchainHash,
          blockchainTimestamp,
        };
        agreementPdfFilename = await generateAgreementPDF(agreementForPDF);
      } catch (error) {
        console.error('Agreement PDF generation error:', error);
      }

      // Insert Agreement
      db.prepare(`
            INSERT INTO agreements (
              id, propertyId, propertyTitle, tenantId, tenantName, landlordId, landlordName,
              finalRent, startDate, endDate, blockchainHash, blockchainTimestamp, pdfPath
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
        agreementId,
        request.propertyId,
        request.propertyTitle,
        request.tenantId,
        request.tenantName,
        request.landlordId,
        landlord.name,
        finalRent,
        startDate,
        endDateISO,
        agreementBlockchainHash,
        blockchainTimestamp,
        agreementPdfFilename ? `/uploads/${agreementPdfFilename}` : null
      );

    } catch (error) {
      console.error('Error creating agreement:', error);
      return res.status(500).json({ error: 'Failed to generate agreement' });
    }

    // Update Property Status
    db.prepare('UPDATE properties SET availability = ? WHERE id = ?').run('rented', request.propertyId);

    // Update Request Status
    db.prepare(`
      UPDATE rental_requests 
      SET status = ?, paymentStatus = ?, blockchainHash = ?, blockchainTimestamp = ?, pdfPath = ?
      WHERE id = ?
    `).run(
      'accepted', // Or 'finalized' - keeping 'accepted' to match existing frontend logic for now, or changing to 'rented' if dashboard filters allow
      paymentStatus,
      blockchainHash,
      blockchainTimestamp,
      pdfFilename ? `/uploads/${pdfFilename}` : null,
      id
    );

    res.json({ success: true, message: 'Payment successful, agreement generated.' });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
