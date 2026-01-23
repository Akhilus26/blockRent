
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const { writeFileSync } = await import('fs');

console.log('--- Agreements Schema ---');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='agreements'").get();
const schema = row ? row.sql : 'Table not found';

console.log('\n--- Agreements Data ---');
const agreements = db.prepare('SELECT id, finalRent, pdfPath FROM agreements').all();
const data = JSON.stringify(agreements, null, 2);

const output = `--- Agreements Schema ---\n${schema}\n\n--- Agreements Data ---\n${data}`;
writeFileSync(join(__dirname, 'agreements_list.txt'), output, 'utf-8');
console.log('Written to agreements_list.txt');
