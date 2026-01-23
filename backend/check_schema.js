
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='rental_requests'").get();

writeFileSync(join(__dirname, 'schema.txt'), row ? row.sql : 'Table not found', 'utf-8');
console.log('Schema written to schema.txt');
