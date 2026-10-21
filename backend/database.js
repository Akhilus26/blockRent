import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.sqlite'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Run database migrations
 * This function ensures all migration files are executed
 */
export function runMigrations() {
  const migrationsDir = join(__dirname, 'migrations');

  // Ensure migrations table exists
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  } catch (error) {
    console.error('Error creating migrations table:', error);
  }

  // Get all migration files
  let migrationFiles = [];
  try {
    migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        name: file,
        path: join(migrationsDir, file)
      }));
  } catch (error) {
    console.error('Error reading migrations directory:', error);
    return;
  }

  // Execute each migration
  for (const migrationFile of migrationFiles) {
    // Check if already executed
    const isExecuted = db.prepare(
      'SELECT id FROM migrations WHERE migration_name = ?'
    ).get(migrationFile.name);

    if (isExecuted) {
      continue; // Skip already executed migrations
    }

    try {
      // Read and execute migration
      const sql = readFileSync(migrationFile.path, 'utf-8');
      db.exec(sql);

      // Mark as executed
      const timestamp = new Date().toISOString();
      db.prepare(
        'INSERT INTO migrations (migration_name, executed_at) VALUES (?, ?)'
      ).run(migrationFile.name, timestamp);

      console.log(`✅ Migration executed: ${migrationFile.name}`);
    } catch (error) {
      console.error(`❌ Error executing migration ${migrationFile.name}:`, error);
      throw error;
    }
  }
}

// Initialize database tables (uses migrations)
export function initDatabase() {
  // Run migrations first
  runMigrations();
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'landlord', 'tenant')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      phone TEXT,
      avatar TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Properties table
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      rent REAL NOT NULL,
      location TEXT NOT NULL,
      images TEXT NOT NULL,
      videoUrl TEXT,
      youtubeUrl TEXT,
      landlordId TEXT NOT NULL,
      landlordName TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      bedrooms INTEGER,
      bathrooms INTEGER,
      area INTEGER,
      district TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (landlordId) REFERENCES users(id)
    )
  `);

  // Rental requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rental_requests (
      id TEXT PRIMARY KEY,
      propertyId TEXT NOT NULL,
      propertyTitle TEXT NOT NULL,
      tenantId TEXT NOT NULL,
      tenantName TEXT NOT NULL,
      landlordId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'countered', 'accepted', 'approved', 'rejected', 'finalized')),
      proposedRent REAL NOT NULL,
      originalRent REAL NOT NULL,
      counterRent REAL,
      finalRent REAL,
      message TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (propertyId) REFERENCES properties(id),
      FOREIGN KEY (tenantId) REFERENCES users(id),
      FOREIGN KEY (landlordId) REFERENCES users(id)
    )
  `);

  // Add counterRent and finalRent columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE rental_requests ADD COLUMN counterRent REAL`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE rental_requests ADD COLUMN finalRent REAL`);
  } catch (e) {
    // Column already exists, ignore
  }
  // Add blockchain fields if they don't exist
  try {
    db.exec(`ALTER TABLE rental_requests ADD COLUMN blockchainHash TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE rental_requests ADD COLUMN blockchainTimestamp TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    db.exec(`ALTER TABLE rental_requests ADD COLUMN pdfPath TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  // Add availability field to properties if it doesn't exist
  try {
    db.exec(`ALTER TABLE properties ADD COLUMN availability TEXT DEFAULT 'available'`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add district field to properties if it doesn't exist
  try {
    db.exec(`ALTER TABLE properties ADD COLUMN district TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add verification fields to users if they don't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN verificationStatus TEXT DEFAULT 'pending'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN identityDocument TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN identityDocumentName TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN identityDocumentType TEXT DEFAULT 'Aadhaar Card'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN rejectionReason TEXT`);
  } catch (e) {}

  // Add ownership document fields to properties if they don't exist
  try {
    db.exec(`ALTER TABLE properties ADD COLUMN ownershipDocument TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE properties ADD COLUMN ownershipDocumentName TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE properties ADD COLUMN rejectionReason TEXT`);
  } catch (e) {}

  // Agreements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agreements (
      id TEXT PRIMARY KEY,
      propertyId TEXT NOT NULL,
      propertyTitle TEXT NOT NULL,
      tenantId TEXT NOT NULL,
      tenantName TEXT NOT NULL,
      landlordId TEXT NOT NULL,
      landlordName TEXT NOT NULL,
      finalRent REAL NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      blockchainHash TEXT NOT NULL,
      blockchainTimestamp TEXT NOT NULL,
      pdfPath TEXT,
      status TEXT NOT NULL DEFAULT 'finalized',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (propertyId) REFERENCES properties(id),
      FOREIGN KEY (tenantId) REFERENCES users(id),
      FOREIGN KEY (landlordId) REFERENCES users(id)
    )
  `);

  // Insert default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@gmail.com');
  if (!adminExists) {
    const adminId = crypto.randomUUID();
    const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
    db.prepare(`
      INSERT INTO users (id, email, name, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, 'admin@gmail.com', 'Admin User', hashedPassword, 'admin', 'approved');
  }

  // Default landlord and tenant seeding removed as per requirement

  console.log('Database initialized successfully');
}

export default db;
