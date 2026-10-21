-- Migration: 013_add_soft_delete_fields.sql
-- Description: Adds soft-delete and deactivation columns to users and properties tables
-- Safety: Non-destructive ALTER TABLE ADD COLUMN statements. Preserves all foreign keys and existing records.

-- 1. Add soft-delete and active status fields to users table
ALTER TABLE users ADD COLUMN isDeleted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN deletedAt TEXT;
ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1;

-- 2. Add soft-delete and active status fields to properties table
ALTER TABLE properties ADD COLUMN isDeleted INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN deletedAt TEXT;
ALTER TABLE properties ADD COLUMN isActive INTEGER DEFAULT 1;

-- 3. Ensure existing records default to active (0 = not deleted, 1 = active)
UPDATE users SET isDeleted = 0, isActive = 1 WHERE isDeleted IS NULL;
UPDATE properties SET isDeleted = 0, isActive = 1 WHERE isDeleted IS NULL;
