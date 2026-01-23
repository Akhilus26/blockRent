/**
 * Migration Runner Script
 * 
 * This script runs SQL migration files in order from the migrations/ folder.
 * It tracks which migrations have been executed to ensure idempotency.
 * 
 * Usage:
 *   node migrate.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const dbPath = join(__dirname, 'database.sqlite');
const migrationsDir = join(__dirname, 'migrations');

// Initialize database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Get list of migration files sorted by name
 */
function getMigrationFiles() {
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically/numerically
    
    return files.map(file => ({
      name: file,
      path: join(migrationsDir, file)
    }));
  } catch (error) {
    console.error('Error reading migrations directory:', error);
    process.exit(1);
  }
}

/**
 * Check if a migration has already been executed
 */
function isMigrationExecuted(migrationName) {
  try {
    const result = db.prepare(
      'SELECT id FROM migrations WHERE migration_name = ?'
    ).get(migrationName);
    
    return result !== undefined;
  } catch (error) {
    // If migrations table doesn't exist, return false
    return false;
  }
}

/**
 * Mark a migration as executed
 */
function markMigrationExecuted(migrationName) {
  try {
    const timestamp = new Date().toISOString();
    db.prepare(
      'INSERT INTO migrations (migration_name, executed_at) VALUES (?, ?)'
    ).run(migrationName, timestamp);
  } catch (error) {
    console.error(`Error marking migration ${migrationName} as executed:`, error);
    throw error;
  }
}

/**
 * Execute a single migration file
 */
function executeMigration(migrationFile) {
  const { name, path } = migrationFile;
  
  // Skip if already executed
  if (isMigrationExecuted(name)) {
    console.log(`⏭️  Skipping ${name} (already executed)`);
    return { executed: false, name };
  }
  
  try {
    // Read SQL file
    const sql = readFileSync(path, 'utf-8');
    
    // Execute migration (multiple statements allowed)
    db.exec(sql);
    
    // Mark as executed
    markMigrationExecuted(name);
    
    console.log(`✅ Executed ${name}`);
    return { executed: true, name };
  } catch (error) {
    console.error(`❌ Error executing migration ${name}:`, error.message);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  // Ensure migrations table exists (run the first migration separately)
  const migrationsTableMigration = getMigrationFiles().find(f => 
    f.name === '000_create_migrations_table.sql'
  );
  
  if (migrationsTableMigration) {
    // Check if migrations table already exists
    try {
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get();
    } catch (error) {
      // Table doesn't exist, create it
      try {
        const sql = readFileSync(migrationsTableMigration.path, 'utf-8');
        db.exec(sql);
        console.log(`✅ Created migrations tracking table`);
      } catch (err) {
        console.error('Error creating migrations table:', err);
        throw err;
      }
    }
  }
  
  // Get all migration files
  const migrationFiles = getMigrationFiles();
  
  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found in migrations/ directory');
    return;
  }
  
  console.log(`📋 Found ${migrationFiles.length} migration file(s)\n`);
  
  let executedCount = 0;
  let skippedCount = 0;
  
  // Execute each migration
  for (const migrationFile of migrationFiles) {
    // Skip the migrations table creation if we already handled it
    if (migrationFile.name === '000_create_migrations_table.sql' && isMigrationExecuted(migrationFile.name)) {
      continue;
    }
    
    try {
      const result = executeMigration(migrationFile);
      if (result.executed) {
        executedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`\n❌ Migration failed. Stopping execution.`);
      console.error(`Failed migration: ${migrationFile.name}`);
      process.exit(1);
    }
  }
  
  console.log(`\n✨ Migrations complete!`);
  console.log(`   Executed: ${executedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${migrationFiles.length}\n`);
}

// Run migrations
try {
  runMigrations();
  db.close();
  process.exit(0);
} catch (error) {
  console.error('Fatal error:', error);
  db.close();
  process.exit(1);
}
