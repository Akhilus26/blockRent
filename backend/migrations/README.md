# Database Migrations

This directory contains SQL migration files for the database schema.

## Migration Files

- `000_create_migrations_table.sql` - Creates the migrations tracking table (must run first)
- `001_create_users.sql` - Creates the users table
- `002_create_properties.sql` - Creates the properties table
- `003_create_rental_requests.sql` - Creates the rental_requests table
- `004_create_agreements.sql` - Creates the agreements table
- `005_create_blockchain_blocks.sql` - Creates the blockchain_blocks table

## Running Migrations

### Automatic Migration (Recommended)
Migrations run automatically when the server starts via `initDatabase()` in `database.js`.

### Manual Migration
Run migrations manually using:
```bash
npm run migrate
```
or
```bash
node migrate.js
```

## How Migrations Work

1. The `migrations` table tracks which migrations have been executed
2. Each migration file is executed only once
3. Migrations are executed in alphabetical/numerical order
4. All migrations use `CREATE TABLE IF NOT EXISTS` for idempotency

## Creating New Migrations

1. Create a new `.sql` file in this directory
2. Use incremental numbering: `006_your_migration_name.sql`
3. Use `CREATE TABLE IF NOT EXISTS` for tables
4. Use `CREATE INDEX IF NOT EXISTS` for indexes
5. Ensure migrations are idempotent (can be run multiple times safely)

## Migration Best Practices

- Always use `IF NOT EXISTS` for CREATE statements
- Use transactions where possible (SQLite supports BEGIN/COMMIT)
- Include comments explaining the migration
- Test migrations on a copy of the database first
- Never modify existing migration files (create new ones instead)
