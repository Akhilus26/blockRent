
import db from './database.js';
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

function generateAgreementPDF(agreement) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument(); // Use standard import
        const filename = `agreement_${agreement.id}.pdf`;
        const filepath = join(uploadsDir, filename);

        const stream = createWriteStream(filepath);
        doc.pipe(stream);

        // PDF content
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

async function backfillPDFs() {
    console.log('Starting PDF backfill...');
    const agreements = db.prepare('SELECT * FROM agreements').all();

    for (const agreement of agreements) {
        console.log(`Processing agreement ${agreement.id}...`);
        try {
            const filename = await generateAgreementPDF(agreement);
            const pdfPath = `/uploads/${filename}`;

            db.prepare('UPDATE agreements SET pdfPath = ? WHERE id = ?').run(pdfPath, agreement.id);
            console.log(`✅ Generated PDF for ${agreement.id}: ${pdfPath}`);
        } catch (error) {
            console.error(`❌ Failed to generate PDF for ${agreement.id}:`, error);
        }
    }
    console.log('Backfill complete.');
}

backfillPDFs();
