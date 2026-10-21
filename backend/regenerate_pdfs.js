
import db from './database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { generateProfessionalAgreementPDF } from './utils/pdfGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

function generateAgreementPDF(agreement) {
    return generateProfessionalAgreementPDF(agreement, uploadsDir);
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
