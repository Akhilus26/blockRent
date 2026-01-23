
import db from './database.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

function generateBlockchainHash(data) {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

function generateAgreementPDF(agreement) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const filename = `agreement_${agreement.id}.pdf`;
        const filepath = join(uploadsDir, filename);

        const stream = createWriteStream(filepath);
        doc.pipe(stream);

        doc.fontSize(20).text('Rental Agreement', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Agreement ID: ${agreement.id}`);
        doc.text(`Property: ${agreement.propertyTitle || 'Unknown Property'}`);
        doc.text(`Tenant: ${agreement.tenantName || 'Unknown Tenant'}`);
        doc.text(`Landlord: ${agreement.landlordName || 'Unknown Landlord'}`);
        doc.moveDown();
        doc.text(`Monthly Rent: ₹${(agreement.finalRent || 0).toLocaleString()}`);
        doc.text(`Start Date: ${new Date(agreement.startDate).toLocaleDateString()}`);
        doc.text(`End Date: ${new Date(agreement.endDate).toLocaleDateString()}`);
        doc.moveDown();
        doc.text(`Blockchain Hash: ${agreement.blockchainHash || 'Pending'}`);
        doc.text(`Timestamp: ${new Date(agreement.blockchainTimestamp).toLocaleString()}`);
        doc.moveDown();
        doc.text('This agreement has been finalized and stored on the blockchain.');
        doc.text('The hash above serves as proof of the agreement\'s integrity.');

        doc.end();
        stream.on('finish', () => resolve(filename));
        stream.on('error', reject);
    });
}

async function backfillAgreements() {
    console.log('Starting Agreement Backfill v2...');

    // 1. Link existing agreements to requests
    console.log('Linking existing agreements...');
    const agreements = db.prepare('SELECT * FROM agreements WHERE requestId IS NULL').all();

    for (const agreement of agreements) {
        // Find a matching accepted request
        const request = db.prepare(`
            SELECT id FROM rental_requests 
            WHERE propertyId = ? AND tenantId = ? AND status IN ('accepted', 'finalized')
        `).get(agreement.propertyId, agreement.tenantId);

        if (request) {
            db.prepare('UPDATE agreements SET requestId = ? WHERE id = ?').run(request.id, agreement.id);
            console.log(`Linked Agreement ${agreement.id} to Request ${request.id}`);
        } else {
            console.log(`Could not find request for Agreement ${agreement.id}`);
        }
    }

    // 2. Create missing agreements for accepted requests
    console.log('Creating missing agreements...');
    const orphanedRequests = db.prepare(`
        SELECT r.* 
        FROM rental_requests r 
        LEFT JOIN agreements a ON r.id = a.requestId 
        WHERE r.status IN ('accepted', 'finalized') AND a.id IS NULL
    `).all();

    console.log(`Found ${orphanedRequests.length} orphaned requests.`);

    for (const req of orphanedRequests) {
        try {
            const agreementId = crypto.randomUUID();
            const startDate = new Date().toISOString();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);
            const endDateISO = endDate.toISOString();
            const blockchainTimestamp = new Date().toISOString();

            // Get landlord info
            const landlord = db.prepare('SELECT name FROM users WHERE id = ?').get(req.landlordId);
            if (!landlord) {
                console.log(`Skipping request ${req.id}: Landlord not found`);
                continue;
            }

            const agreementData = {
                id: agreementId,
                propertyId: req.propertyId,
                tenantId: req.tenantId,
                landlordId: req.landlordId,
                finalRent: req.finalRent,
                startDate,
                endDate: endDateISO,
                timestamp: blockchainTimestamp,
            };
            const hash = generateBlockchainHash(agreementData);

            const agreementForPDF = {
                id: agreementId,
                propertyId: req.propertyId,
                propertyTitle: req.propertyTitle,
                tenantId: req.tenantId,
                tenantName: req.tenantName,
                landlordId: req.landlordId,
                landlordName: landlord.name,
                finalRent: req.finalRent,
                startDate,
                endDate: endDateISO,
                blockchainHash: hash,
                blockchainTimestamp,
            };

            const pdfFilename = await generateAgreementPDF(agreementForPDF);

            db.prepare(`
                INSERT INTO agreements (
                    id, propertyId, propertyTitle, tenantId, tenantName, landlordId, landlordName,
                    requestId, finalRent, startDate, endDate, blockchainHash, blockchainTimestamp, pdfPath
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                agreementId,
                req.propertyId,
                req.propertyTitle,
                req.tenantId,
                req.tenantName,
                req.landlordId,
                landlord.name,
                req.id,
                req.finalRent,
                startDate,
                endDateISO,
                hash,
                blockchainTimestamp,
                `/uploads/${pdfFilename}`
            );

            console.log(`Created Agreement ${agreementId} for Request ${req.id}`);
        } catch (error) {
            console.error(`Failed to create agreement for request ${req.id}:`, error);
        }
    }

    console.log('Backfill complete.');
}

backfillAgreements();
