
import db from './database.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('--- Rental Requests ---');
const requests = db.prepare('SELECT id, status, tenantId, propertyId, propertyTitle, finalRent, proposedRent, originalRent, counterRent, landlordId FROM rental_requests').all();

console.log('\n--- Agreements ---');
const agreements = db.prepare('SELECT id, tenantId, propertyId FROM agreements').all();

const output = JSON.stringify({ requests, agreements }, null, 2);
writeFileSync(join(__dirname, 'db_dump.json'), output, 'utf-8');
console.log('Dumped to db_dump.json');
