-- Migration: 007_add_blockchain_fields_to_requests.sql
-- Description: Add blockchain and PDF fields to rental_requests table
-- Created: 2024

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Add blockchainHash column (nullable - only set when request is accepted)
ALTER TABLE rental_requests ADD COLUMN blockchainHash TEXT;

-- Add blockchainTimestamp column (nullable - only set when request is accepted)
ALTER TABLE rental_requests ADD COLUMN blockchainTimestamp TEXT;

-- Add pdfPath column (nullable - only set when request is accepted and PDF is generated)
ALTER TABLE rental_requests ADD COLUMN pdfPath TEXT;

-- Create index on blockchainHash for blockchain verification
CREATE INDEX IF NOT EXISTS idx_rental_requests_blockchain_hash ON rental_requests(blockchainHash);
