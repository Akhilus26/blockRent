# Database Migration System - Quick Guide

## Overview

A simple SQL-based migration system has been implemented for SQLite database schema management. This system uses pure SQL files and a Node.js runner script - no ORM required.

## Files Created

### Migration Files (`backend/migrations/`)
1. **000_create_migrations_table.sql** - Tracking table for executed migrations
2. **001_create_users.sql** - Users table (authentication & user management)
3. **002_create_properties.sql** - Properties table (property listings)
4. **003_create_rental_requests.sql** - Rental requests table (tenant negotiations)
5. **004_create_agreements.sql** - Agreements table (finalized rental agreements)
6. **005_create_blockchain_blocks.sql** - Blockchain blocks table (blockchain data)

### Migration Runner
- **migrate.js** - Standalone migration runner script
- **database.js** - Updated to automatically run migrations on startup

## Usage

### Automatic Migration (Default)
Migrations run automatically when you start the server:
```bash
npm start
# or
npm run dev
```

### Manual Migration
Run migrations manually without starting the server:
```bash
npm run migrate
# or
node migrate.js
```

## How It Works

1. **Migration Tracking**: The `migrations` table stores which migrations have been executed
2. **Idempotent Execution**: Each migration uses `IF NOT EXISTS` to ensure safe re-runs
3. **Sequential Execution**: Migrations run in numerical/alphabetical order
4. **One-Time Execution**: Each migration file executes only once (tracked in database)

## Migration Structure

Each migration file contains:
- SQL statements with `IF NOT EXISTS` for safety
- Index creation for performance
- Foreign key constraints
- Comments explaining the migration

## Example Migration File

```sql
-- Migration: 001_create_users.sql
-- Description: Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    ...
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Creating New Migrations

1. Create a new file: `006_your_migration_name.sql`
2. Use `CREATE TABLE IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS`
3. Add clear comments
4. Run migrations: `npm run migrate`

## Database Schema

### Users Table
- Authentication and user management
- Roles: admin, landlord, tenant
- Status tracking: pending, approved, rejected

### Properties Table
- Property listings
- Links to landlord via foreign key
- Status: pending, approved, rejected

### Rental Requests Table
- Tenant rental requests
- Negotiation status tracking
- Links to properties and users

### Agreements Table
- Finalized rental agreements
- Blockchain hash storage
- PDF path for agreement documents

### Blockchain Blocks Table
- Blockchain block data
- Hash chain verification
- Links to agreements

## Troubleshooting

### Migration Already Executed
If a migration shows as "already executed", it will be skipped. This is normal behavior.

### Migration Fails
If a migration fails:
1. Check the error message in console
2. Verify SQL syntax in the migration file
3. Check database permissions
4. Review foreign key constraints

### Reset Migrations (Development Only)
To reset migrations (⚠️ **WARNING**: Deletes migration tracking):
```sql
DELETE FROM migrations;
```
Then re-run: `npm run migrate`

## Best Practices

1. ✅ Always use `IF NOT EXISTS` in CREATE statements
2. ✅ Test migrations on a copy of the database first
3. ✅ Never modify existing migration files (create new ones)
4. ✅ Use descriptive migration file names
5. ✅ Add comments to explain complex migrations
6. ✅ Keep migrations small and focused

## Notes

- Migrations are **idempotent** - safe to run multiple times
- Foreign keys are enabled by default
- All timestamps use SQLite's `datetime('now')` function
- No ORM dependencies - pure SQL only
