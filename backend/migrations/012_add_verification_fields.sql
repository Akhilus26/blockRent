-- Migration: 012_add_verification_fields.sql
-- Description: Adds tenant identity verification and landlord property ownership verification fields
-- Safety: Non-destructive ALTER TABLE ADD COLUMN statements. No tables dropped or recreated.

-- 1. Add verification fields to users table
ALTER TABLE users ADD COLUMN verificationStatus TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN identityDocument TEXT;
ALTER TABLE users ADD COLUMN identityDocumentName TEXT;
ALTER TABLE users ADD COLUMN identityDocumentType TEXT DEFAULT 'Aadhaar Card';
ALTER TABLE users ADD COLUMN rejectionReason TEXT;

-- 2. Add ownership document fields to properties table
ALTER TABLE properties ADD COLUMN ownershipDocument TEXT;
ALTER TABLE properties ADD COLUMN ownershipDocumentName TEXT;
ALTER TABLE properties ADD COLUMN rejectionReason TEXT;

-- 3. Explicit Migration Rules for Existing Users:
-- Existing tenants default to verificationStatus = 'pending' (explicitly requiring admin verification).
UPDATE users SET verificationStatus = 'pending' WHERE role = 'tenant';
UPDATE users SET verificationStatus = 'verified' WHERE role IN ('admin', 'landlord');
