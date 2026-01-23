-- Migration: 000_create_migrations_table.sql
-- Description: Create migrations table to track which migrations have been run
-- This must be the first migration to run
-- Created: 2024

-- Create migrations table to track executed migrations
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT UNIQUE NOT NULL,
    executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index on migration_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(migration_name);
